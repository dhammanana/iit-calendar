import { v4 as uuidv4 } from 'uuid';
import { initPowerSync, db } from '../db/powersync';
import { StudySession } from '../components/study/StudyInsights';
import { StudySessionRecord } from '../db/schema';

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
      const savedSessionsStr = localStorage.getItem('study_sessions');
      if (savedSessionsStr) {
        const legacySessions: StudySession[] = JSON.parse(savedSessionsStr);
        if (Array.isArray(legacySessions)) {
          for (const session of legacySessions) {
            const newId = session.id || uuidv4();
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

      // Mark migration complete without deleting localStorage legacy key
      localStorage.setItem('study_sqlite_migrated', 'true');
      console.log('Study SQLite migration completed successfully.');
    } catch (err) {
      console.error('Failed to migrate study stats to SQLite:', err);
    }
  }

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

      // Combine and deduplicate
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
      // Deduplication check: avoid logging multiple sessions for the exact same start timestamp
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

      const id = uuidv4();

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
        id: uuidv4(),
        date: sessionDate,
        durationMs
      };

      try {
        const savedSessionsStr = localStorage.getItem('study_sessions');
        const sessions: StudySession[] = savedSessionsStr ? JSON.parse(savedSessionsStr) : [];

        // Prevent exact duplicate in localStorage
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

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l());
  }
}

export const studyDbService = StudyDbService.getInstance();
