import { uuidv7 } from 'uuidv7';
import { initPowerSync, db } from '../db/powersync';
import { StudySession } from '../components/study/StudyInsights';
import { StudySessionRecord, StudyTaskRecord } from '../db/schema';

export interface Task {
  id: string;
  name: string;
  est: number;
  act: number;
  completed: boolean;
}

class StudyDbService {
  private static instance: StudyDbService;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private listeners: (() => void)[] = [];

  private constructor() {}

  public static getInstance(): StudyDbService {
    if (!StudyDbService.instance) {
      StudyDbService.instance = new StudyDbService();
    }
    return StudyDbService.instance;
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        await initPowerSync();
        await this.migrateLegacyLocalStorageData();
        this.isInitialized = true;
      } catch (err) {
        console.error('[StudyDbService] Failed during init:', err);
      }
    })();

    return this.initPromise;
  }

  private async migrateLegacyLocalStorageData(): Promise<void> {
    const isMigrated = localStorage.getItem('study_sqlite_migrated');
    if (isMigrated === 'true') return;

    try {
      // 1. Migrate study sessions
      const savedSessionsStr = localStorage.getItem('study_sessions');
      if (savedSessionsStr) {
        const legacySessions: StudySession[] = JSON.parse(savedSessionsStr);
        if (Array.isArray(legacySessions)) {
          for (const session of legacySessions) {
            const newId = session.id || uuidv7();
            const sessionDate = session.date || new Date().toISOString();
            const createdAt = sessionDate;
            const updatedAt = new Date().toISOString();
            const durationMs = Number(session.durationMs) || 0;

            await db.execute(
              `INSERT INTO study_sessions (id, date, duration_ms, created_at, updated_at, deleted) VALUES (?, ?, ?, ?, ?, 0)`,
              [newId, sessionDate, durationMs, createdAt, updatedAt]
            );
          }
        }
      }

      // 2. Migrate study tasks
      const savedTasksStr = localStorage.getItem('study_tasks');
      const activeTaskId = localStorage.getItem('study_active_task');
      if (savedTasksStr) {
        const legacyTasks: Task[] = JSON.parse(savedTasksStr);
        if (Array.isArray(legacyTasks)) {
          const nowIso = new Date().toISOString();
          for (const t of legacyTasks) {
            const taskId = t.id || uuidv7();
            const isActive = activeTaskId === t.id ? 1 : 0;
            await db.execute(
              `INSERT INTO study_tasks (id, name, est, act, completed, is_active, created_at, updated_at, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
              [taskId, t.name || '', t.est || 1, t.act || 0, t.completed ? 1 : 0, isActive, nowIso, nowIso]
            );
          }
        }
      }

      // Mark migration complete without deleting localStorage legacy key
      localStorage.setItem('study_sqlite_migrated', 'true');
      console.log('Study SQLite migration completed successfully.');
    } catch (err) {
      console.error('Failed to migrate study stats & tasks to SQLite:', err);
    }
  }

  // --- SESSIONS API ---

  public async getSessions(): Promise<StudySession[]> {
    await this.init();
    let sqliteSessions: StudySession[] = [];
    try {
      const dbQueryPromise = db.getAll<StudySessionRecord>(
        `SELECT * FROM study_sessions WHERE deleted IS NOT 1 ORDER BY date DESC`
      );
      const queryTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('SQLite query timeout')), 1500)
      );

      const result = await Promise.race([dbQueryPromise, queryTimeout]);

      sqliteSessions = result.map(row => ({
        id: row.id,
        date: row.date,
        durationMs: row.duration_ms
      }));
    } catch (err) {
      console.warn('Failed or timed out fetching study sessions from SQLite:', err);
    }

    try {
      const savedSessionsStr = localStorage.getItem('study_sessions');
      const lsSessions: StudySession[] = savedSessionsStr ? JSON.parse(savedSessionsStr) : [];

      const combined = [...sqliteSessions];
      for (const s of lsSessions) {
        if (!combined.some(c => c.id === s.id || c.date === s.date)) {
          combined.push(s);
        }
      }
      return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch {
      return sqliteSessions;
    }
  }

  public async addSession(durationMs: number, customDate?: string): Promise<StudySession> {
    await this.init();
    const nowIso = new Date().toISOString();
    const sessionDate = customDate || nowIso;

    try {
      const dbQueryPromise = db.getAll<StudySessionRecord>(
        `SELECT * FROM study_sessions WHERE date = ? AND deleted IS NOT 1`,
        [sessionDate]
      );
      const queryTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('SQLite query timeout')), 1500)
      );

      const existing = await Promise.race([dbQueryPromise, queryTimeout]);

      if (existing.length > 0) {
        return {
          id: existing[0].id,
          date: existing[0].date,
          durationMs: existing[0].duration_ms
        };
      }

      const id = uuidv7();

      const dbExecPromise = db.execute(
        `INSERT INTO study_sessions (id, date, duration_ms, created_at, updated_at, deleted) VALUES (?, ?, ?, ?, ?, 0)`,
        [id, sessionDate, durationMs, nowIso, nowIso]
      );
      const execTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('SQLite execute timeout')), 1500)
      );

      await Promise.race([dbExecPromise, execTimeout]);
      this.notifyListeners();

      return {
        id,
        date: sessionDate,
        durationMs
      };
    } catch (dbErr) {
      console.warn('[StudyDbService] SQLite query/execute error or timeout, saving to localStorage:', dbErr);
      const newSession: StudySession = {
        id: uuidv7(),
        date: sessionDate,
        durationMs
      };

      try {
        const savedSessionsStr = localStorage.getItem('study_sessions');
        const sessions: StudySession[] = savedSessionsStr ? JSON.parse(savedSessionsStr) : [];

        if (!sessions.some(s => s.date === sessionDate)) {
          sessions.unshift(newSession);
          localStorage.setItem('study_sessions', JSON.stringify(sessions));
        }
      } catch (lsErr) {
        console.error('[StudyDbService] Failed to save session in localStorage fallback:', lsErr);
      }

      this.notifyListeners();
      return newSession;
    }
  }

  public async deleteSession(id: string): Promise<void> {
    await this.init();
    const nowIso = new Date().toISOString();

    try {
      await db.execute(
        `UPDATE study_sessions SET deleted = 1, updated_at = ? WHERE id = ?`,
        [nowIso, id]
      );
    } catch (dbErr) {
      console.warn('[StudyDbService] Failed to mark study session as deleted in SQLite:', dbErr);
    }

    try {
      const savedSessionsStr = localStorage.getItem('study_sessions');
      if (savedSessionsStr) {
        let sessions: StudySession[] = JSON.parse(savedSessionsStr);
        sessions = sessions.filter(s => s.id !== id);
        localStorage.setItem('study_sessions', JSON.stringify(sessions));
      }
    } catch (lsErr) {
      console.error('[StudyDbService] Failed to remove session from localStorage fallback:', lsErr);
    }

    this.notifyListeners();
  }

  // --- TASKS API ---

  public async getTasks(): Promise<Task[]> {
    await this.init();
    let sqliteTasks: Task[] = [];
    try {
      const result = await db.getAll<StudyTaskRecord>(
        `SELECT * FROM study_tasks WHERE deleted IS NOT 1 ORDER BY created_at ASC`
      );
      sqliteTasks = result.map(row => ({
        id: row.id,
        name: row.name,
        est: row.est,
        act: row.act,
        completed: row.completed === 1
      }));
    } catch (err) {
      console.warn('Failed to fetch study tasks from SQLite, falling back to localStorage:', err);
      try {
        const savedTasksStr = localStorage.getItem('study_tasks');
        sqliteTasks = savedTasksStr ? JSON.parse(savedTasksStr) : [];
      } catch {
        sqliteTasks = [];
      }
    }
    return sqliteTasks;
  }

  public async getActiveTaskId(): Promise<string | null> {
    await this.init();
    try {
      const result = await db.getAll<StudyTaskRecord>(
        `SELECT id FROM study_tasks WHERE is_active = 1 AND deleted IS NOT 1 LIMIT 1`
      );
      if (result.length > 0) return result[0].id;
    } catch (err) {
      console.warn('Failed to fetch active task from SQLite:', err);
    }
    return localStorage.getItem('study_active_task') || null;
  }

  public async setActiveTaskId(taskId: string | null): Promise<void> {
    await this.init();
    const nowIso = new Date().toISOString();
    try {
      await db.execute(`UPDATE study_tasks SET is_active = 0, updated_at = ?`, [nowIso]);
      if (taskId) {
        await db.execute(`UPDATE study_tasks SET is_active = 1, updated_at = ? WHERE id = ?`, [nowIso, taskId]);
        localStorage.setItem('study_active_task', taskId);
      } else {
        localStorage.removeItem('study_active_task');
      }
    } catch (err) {
      console.warn('Failed to set active task in SQLite:', err);
      if (taskId) localStorage.setItem('study_active_task', taskId);
      else localStorage.removeItem('study_active_task');
    }
    this.notifyListeners();
  }

  public async addTask(name: string, est: number): Promise<Task> {
    await this.init();
    const id = uuidv7();
    const nowIso = new Date().toISOString();
    const newTask: Task = { id, name, est, act: 0, completed: false };

    try {
      await db.execute(
        `INSERT INTO study_tasks (id, name, est, act, completed, is_active, created_at, updated_at, deleted) VALUES (?, ?, ?, 0, 0, 0, ?, ?, 0)`,
        [id, name, est, nowIso, nowIso]
      );
    } catch (err) {
      console.warn('Failed to add task to SQLite:', err);
    }

    this.notifyListeners();
    return newTask;
  }

  public async updateTask(id: string, updates: Partial<Pick<Task, 'name' | 'est' | 'act' | 'completed'>>): Promise<void> {
    await this.init();
    const nowIso = new Date().toISOString();

    try {
      const current = await db.getAll<StudyTaskRecord>(`SELECT * FROM study_tasks WHERE id = ?`, [id]);
      if (current.length > 0) {
        const row = current[0];
        const name = updates.name !== undefined ? updates.name : row.name;
        const est = updates.est !== undefined ? updates.est : row.est;
        const act = updates.act !== undefined ? updates.act : row.act;
        const completed = updates.completed !== undefined ? (updates.completed ? 1 : 0) : row.completed;

        await db.execute(
          `UPDATE study_tasks SET name = ?, est = ?, act = ?, completed = ?, updated_at = ? WHERE id = ?`,
          [name, est, act, completed, nowIso, id]
        );
      }
    } catch (err) {
      console.warn('Failed to update task in SQLite:', err);
    }

    this.notifyListeners();
  }

  public async deleteTask(id: string): Promise<void> {
    await this.init();
    const nowIso = new Date().toISOString();

    try {
      await db.execute(
        `UPDATE study_tasks SET deleted = 1, is_active = 0, updated_at = ? WHERE id = ?`,
        [nowIso, id]
      );
    } catch (err) {
      console.warn('Failed to delete task in SQLite:', err);
    }

    this.notifyListeners();
  }

  // --- BACKUP & RESTORE ---

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l());
  }

  public async getAllRecordsForBackup(): Promise<{ sessions: StudySessionRecord[]; tasks: StudyTaskRecord[] }> {
    await this.init();
    const sessions = await db.getAll<StudySessionRecord>(`SELECT * FROM study_sessions`);
    const tasks = await db.getAll<StudyTaskRecord>(`SELECT * FROM study_tasks`);
    return { sessions, tasks };
  }

  public async restoreBackupRecords(backupData: { sessions?: StudySessionRecord[]; tasks?: StudyTaskRecord[] } | StudySessionRecord[]): Promise<void> {
    await this.init();

    if (Array.isArray(backupData)) {
      // Backwards compatibility for legacy session array
      for (const record of backupData) {
        const id = record.id || uuidv7();
        const date = record.date || new Date().toISOString();
        const durationMs = record.duration_ms || 0;
        const createdAt = record.created_at || date;
        const updatedAt = record.updated_at || new Date().toISOString();
        const deleted = record.deleted || 0;

        await db.execute(
          `INSERT OR REPLACE INTO study_sessions (id, date, duration_ms, created_at, updated_at, deleted) VALUES (?, ?, ?, ?, ?, ?)`,
          [id, date, durationMs, createdAt, updatedAt, deleted]
        );
      }
    } else if (backupData && typeof backupData === 'object') {
      if (Array.isArray(backupData.sessions)) {
        for (const record of backupData.sessions) {
          const id = record.id || uuidv7();
          const date = record.date || new Date().toISOString();
          const durationMs = record.duration_ms || 0;
          const createdAt = record.created_at || date;
          const updatedAt = record.updated_at || new Date().toISOString();
          const deleted = record.deleted || 0;

          await db.execute(
            `INSERT OR REPLACE INTO study_sessions (id, date, duration_ms, created_at, updated_at, deleted) VALUES (?, ?, ?, ?, ?, ?)`,
            [id, date, durationMs, createdAt, updatedAt, deleted]
          );
        }
      }

      if (Array.isArray(backupData.tasks)) {
        for (const record of backupData.tasks) {
          const id = record.id || uuidv7();
          const name = record.name || '';
          const est = record.est || 1;
          const act = record.act || 0;
          const completed = record.completed || 0;
          const isActive = record.is_active || 0;
          const createdAt = record.created_at || new Date().toISOString();
          const updatedAt = record.updated_at || new Date().toISOString();
          const deleted = record.deleted || 0;

          await db.execute(
            `INSERT OR REPLACE INTO study_tasks (id, name, est, act, completed, is_active, created_at, updated_at, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, name, est, act, completed, isActive, createdAt, updatedAt, deleted]
          );
        }
      }
    }

    this.notifyListeners();
  }
}

export const studyDbService = StudyDbService.getInstance();
