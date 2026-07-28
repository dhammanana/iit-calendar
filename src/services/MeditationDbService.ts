import { uuidv7 } from 'uuidv7';
import { initPowerSync, db } from '../db/powersync';
import { MeditationSession } from '../types';
import { MeditationSessionRecord } from '../db/schema';

class MeditationDbService {
  private static instance: MeditationDbService;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private listeners: (() => void)[] = [];

  private constructor() {}

  public static getInstance(): MeditationDbService {
    if (!MeditationDbService.instance) {
      MeditationDbService.instance = new MeditationDbService();
    }
    return MeditationDbService.instance;
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
        console.error('[MeditationDbService] Failed during init:', err);
      }
    })();

    return this.initPromise;
  }

  private async migrateLegacyLocalStorageData(): Promise<void> {
    const isMigrated = localStorage.getItem('meditation_sqlite_migrated');
    if (isMigrated === 'true') return;

    try {
      const savedStatsStr = localStorage.getItem('zen_meditation_stats');
      if (savedStatsStr) {
        const parsed = JSON.parse(savedStatsStr);
        const legacySessions: MeditationSession[] = Array.isArray(parsed?.sessions) ? parsed.sessions : [];

        for (const session of legacySessions) {
          const newId = uuidv7();
          const sessionDate = session.date || new Date().toISOString();
          const createdAt = sessionDate;
          const updatedAt = new Date().toISOString();
          const durationMin = Number(session.durationMin) || 0;

          await db.execute(
            `INSERT INTO meditation_sessions (id, date, duration_min, created_at, updated_at, deleted) VALUES (?, ?, ?, ?, ?, 0)`,
            [newId, sessionDate, durationMin, createdAt, updatedAt]
          );
        }
      }

      // Mark migration complete without deleting localStorage legacy key
      localStorage.setItem('meditation_sqlite_migrated', 'true');
      console.log('Meditation SQLite migration completed successfully.');
    } catch (err) {
      console.error('Failed to migrate meditation stats to SQLite:', err);
    }
  }

  public async getSessions(): Promise<MeditationSession[]> {
    await this.init();
    let sqliteSessions: MeditationSession[] = [];
    try {
      const dbQueryPromise = db.getAll<MeditationSessionRecord>(
        `SELECT * FROM meditation_sessions WHERE deleted IS NOT 1 ORDER BY date DESC`
      );
      const queryTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('SQLite query timeout')), 1500)
      );

      const result = await Promise.race([dbQueryPromise, queryTimeout]);

      sqliteSessions = result.map(row => ({
        id: row.id,
        date: row.date,
        durationMin: row.duration_min
      }));
    } catch (err) {
      console.warn('Failed or timed out fetching meditation sessions from SQLite:', err);
    }

    try {
      const savedStatsStr = localStorage.getItem('zen_meditation_stats');
      const parsed = savedStatsStr ? JSON.parse(savedStatsStr) : { sessions: [] };
      const lsSessions: MeditationSession[] = Array.isArray(parsed?.sessions) ? parsed.sessions : [];

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

  public async addSession(durationMin: number, customDate?: string): Promise<MeditationSession> {
    await this.init();
    const nowIso = new Date().toISOString();
    const sessionDate = customDate || nowIso;

    try {
      // Deduplication check: avoid logging multiple sessions for the exact same start timestamp
      const dbQueryPromise = db.getAll<MeditationSessionRecord>(
        `SELECT * FROM meditation_sessions WHERE date = ? AND deleted IS NOT 1`,
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
          durationMin: existing[0].duration_min
        };
      }

      const id = uuidv7();

      const dbExecPromise = db.execute(
        `INSERT INTO meditation_sessions (id, date, duration_min, created_at, updated_at, deleted) VALUES (?, ?, ?, ?, ?, 0)`,
        [id, sessionDate, durationMin, nowIso, nowIso]
      );
      const execTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('SQLite execute timeout')), 1500)
      );

      await Promise.race([dbExecPromise, execTimeout]);
      this.notifyListeners();

      return {
        id,
        date: sessionDate,
        durationMin
      };
    } catch (dbErr) {
      console.warn('[MeditationDbService] SQLite query/execute error or timeout, saving to localStorage:', dbErr);
      const newSession: MeditationSession = {
        id: uuidv7(),
        date: sessionDate,
        durationMin
      };

      try {
        const savedStatsStr = localStorage.getItem('zen_meditation_stats');
        const parsed = savedStatsStr ? JSON.parse(savedStatsStr) : { sessions: [] };
        const sessions: MeditationSession[] = Array.isArray(parsed?.sessions) ? parsed.sessions : [];
        
        // Prevent exact duplicate in localStorage
        if (!sessions.some(s => s.date === sessionDate)) {
          sessions.unshift(newSession);
          localStorage.setItem('zen_meditation_stats', JSON.stringify({ sessions }));
        }
      } catch (lsErr) {
        console.error('[MeditationDbService] Failed to save session in localStorage fallback:', lsErr);
      }

      this.notifyListeners();
      return newSession;
    }
  }

  public async deleteSession(id: string): Promise<void> {
    await this.init();
    const nowIso = new Date().toISOString();
    await db.execute(
      `UPDATE meditation_sessions SET deleted = 1, updated_at = ? WHERE id = ?`,
      [nowIso, id]
    );
    this.notifyListeners();
  }

  public async getStats(): Promise<{ sessions: MeditationSession[] }> {
    const sessions = await this.getSessions();
    return { sessions };
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb());
  }

  public async getAllRecordsForBackup(): Promise<MeditationSessionRecord[]> {
    await this.init();
    return db.getAll<MeditationSessionRecord>(`SELECT * FROM meditation_sessions`);
  }

  public async restoreBackupRecords(records: MeditationSessionRecord[]): Promise<void> {
    await this.init();
    if (!Array.isArray(records)) return;

    for (const record of records) {
      const id = record.id || uuidv7();
      const date = record.date || new Date().toISOString();
      const durationMin = record.duration_min || 0;
      const createdAt = record.created_at || date;
      const updatedAt = record.updated_at || new Date().toISOString();
      const deleted = record.deleted || 0;

      await db.execute(
        `INSERT OR REPLACE INTO meditation_sessions (id, date, duration_min, created_at, updated_at, deleted) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, date, durationMin, createdAt, updatedAt, deleted]
      );
    }
    this.notifyListeners();
  }
}

export const meditationDbService = MeditationDbService.getInstance();
