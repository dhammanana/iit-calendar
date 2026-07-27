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
      await initPowerSync();
      await this.migrateLegacyLocalStorageData();
      this.isInitialized = true;
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
    try {
      const result = await db.getAll<MeditationSessionRecord>(
        `SELECT * FROM meditation_sessions WHERE deleted IS NOT 1 ORDER BY date DESC`
      );

      return result.map(row => ({
        id: row.id,
        date: row.date,
        durationMin: row.duration_min
      }));
    } catch (err) {
      console.error('Failed to fetch meditation sessions from SQLite:', err);
      return [];
    }
  }

  public async addSession(durationMin: number, customDate?: string): Promise<MeditationSession> {
    await this.init();
    const nowIso = new Date().toISOString();
    const sessionDate = customDate || nowIso;

    // Deduplication check: avoid logging multiple sessions for the exact same start timestamp
    const existing = await db.getAll<MeditationSessionRecord>(
      `SELECT * FROM meditation_sessions WHERE date = ? AND deleted IS NOT 1`,
      [sessionDate]
    );

    if (existing.length > 0) {
      return {
        id: existing[0].id,
        date: existing[0].date,
        durationMin: existing[0].duration_min
      };
    }

    const id = uuidv7();

    await db.execute(
      `INSERT INTO meditation_sessions (id, date, duration_min, created_at, updated_at, deleted) VALUES (?, ?, ?, ?, ?, 0)`,
      [id, sessionDate, durationMin, nowIso, nowIso]
    );

    this.notifyListeners();

    return {
      id,
      date: sessionDate,
      durationMin
    };
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
