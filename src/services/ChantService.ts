import { uuidv7 } from 'uuidv7';
import { initPowerSync, db } from '../db/powersync';
import { Chant, UserChant, ChantSession } from '../types';
import { UserChantRecord, ChantSessionRecord } from '../db/schema';
import defaultChants from '../data/chants.json';

function getLocal<T>(key: string, defaultValue: T): T {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
}

export function getChantTitle(chant: Chant | UserChant, t?: (key: string) => string): string {
  const def = defaultChants.find(c => (chant.nameKey && (c as any).nameKey === chant.nameKey) || c.id.toString() === chant.id);
  const nameKey = chant.nameKey || (def as any)?.nameKey;
  if (nameKey && t) {
    const translated = t(nameKey);
    if (translated && translated !== nameKey) return translated;
  }
  return chant.title || (chant as any).name || (t ? (t('chant.unknown') || 'Unknown') : 'Unknown');
}

export function isChantNamePali(chant: Chant | UserChant): boolean {
  if (chant.isNamePali !== undefined) return chant.isNamePali;
  const def = defaultChants.find(c => (chant.nameKey && (c as any).nameKey === chant.nameKey) || c.id.toString() === chant.id);
  if (def && (def as any).isNamePali !== undefined) {
    return (def as any).isNamePali;
  }
  return true;
}

class ChantService {
  private static instance: ChantService;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private listeners: ((chants: UserChant[]) => void)[] = [];

  public static getInstance(): ChantService {
    if (!ChantService.instance) {
      ChantService.instance = new ChantService();
    }
    return ChantService.instance;
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
        console.error('[ChantService] Failed during init:', err);
      }
    })();

    return this.initPromise;
  }

  private async migrateLegacyLocalStorageData(): Promise<void> {
    const isMigrated = localStorage.getItem('chants_sqlite_migrated');
    if (isMigrated === 'true') return;

    try {
      const nowIso = new Date().toISOString();
      const legacyIdMap: Record<string, string> = {};

      // 1. Migrate custom user chants from localStorage to SQLite
      const savedChantsStr = localStorage.getItem('app_user_chants');
      let legacyChants: any[] = [];
      if (savedChantsStr) {
        try {
          legacyChants = JSON.parse(savedChantsStr);
        } catch {}
      }

      if (Array.isArray(legacyChants) && legacyChants.length > 0) {
        const customLegacyChants = legacyChants.filter(c => Boolean(c.isCustom));
        for (const c of customLegacyChants) {
          const newId = uuidv7();
          const legacyId = (c.id !== undefined && c.id !== null) ? c.id.toString() : '';
          if (legacyId) {
            legacyIdMap[legacyId] = newId;
          }
          await db.execute(
            `INSERT INTO user_chants (id, title, name_key, is_name_pali, chant, total_count, last_used, is_custom, milestone, created_at, updated_at, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 0)`,
            [
              newId,
              c.title || c.name || '',
              c.nameKey || null,
              c.isNamePali !== false ? 1 : 0,
              c.chant || c.content || null,
              Number(c.totalCount) || 0,
              Number(c.lastUsed) || 0,
              Number(c.milestone) || 108,
              nowIso,
              nowIso
            ]
          );
        }
      }

      // 2. Migrate chant sessions from localStorage to SQLite
      const savedSessionsStr = localStorage.getItem('app_chant_sessions');
      let legacySessions: any[] = [];
      if (savedSessionsStr) {
        try {
          legacySessions = JSON.parse(savedSessionsStr);
        } catch {}
      }

      if (Array.isArray(legacySessions) && legacySessions.length > 0) {
        for (const s of legacySessions) {
          const newSessionId = uuidv7();
          const legacyChantId = (s.chantId !== undefined && s.chantId !== null) ? s.chantId.toString() : '';
          const mappedChantId = legacyIdMap[legacyChantId] || legacyChantId;

          await db.execute(
            `INSERT INTO chant_sessions (id, chant_id, count, timestamp, duration_min, created_at, updated_at, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
            [
              newSessionId,
              mappedChantId,
              Number(s.count) || 0,
              Number(s.timestamp) || Date.now(),
              s.durationMin ? Number(s.durationMin) : null,
              nowIso,
              nowIso
            ]
          );
        }
      }

      // Flag migration complete permanently without deleting localStorage keys
      localStorage.setItem('chants_sqlite_migrated', 'true');
      console.log('[ChantService] Chants SQLite migration completed successfully.');
    } catch (err) {
      console.error('[ChantService] Failed during chant migration:', err);
    }
  }

  private async notifyListeners() {
    const chants = await this.getUserChants();
    this.listeners.forEach(l => l(chants));
  }

  async getUserChants(): Promise<UserChant[]> {
    await this.init();

    // Aggregate session stats (total count & last used) for all chant IDs (default, custom, deleted)
    const sessionStatsMap: Record<string, { totalCount: number; lastUsed: number }> = {};
    try {
      type SessionStatRow = { chant_id: string; total_count: number; last_used: number };
      const statsRows = await db.getAll<SessionStatRow>(
        `SELECT chant_id, SUM(count) as total_count, MAX(timestamp) as last_used FROM chant_sessions WHERE deleted IS NOT 1 GROUP BY chant_id`
      );
      for (const row of statsRows) {
        if (row.chant_id) {
          sessionStatsMap[row.chant_id] = {
            totalCount: Number(row.total_count) || 0,
            lastUsed: Number(row.last_used) || 0
          };
        }
      }
    } catch (err) {
      console.warn('[ChantService] Failed to aggregate session stats from SQLite:', err);
    }

    const knownChantIds = new Set<string>();

    // 1. Default chants from chants.json (not stored in DB)
    const defaultList: UserChant[] = defaultChants.map(c => {
      const chantIdStr = c.id.toString();
      knownChantIds.add(chantIdStr);
      const stats = sessionStatsMap[chantIdStr] || { totalCount: 0, lastUsed: 0 };
      return {
        id: chantIdStr,
        title: c.name,
        nameKey: (c as any).nameKey,
        isNamePali: (c as any).isNamePali,
        chant: c.chant,
        content: c.chant,
        totalCount: stats.totalCount,
        lastUsed: stats.lastUsed,
        isCustom: false,
        milestone: 108
      };
    });

    // 2. User-defined custom chants from SQLite user_chants table
    let customList: UserChant[] = [];
    try {
      const customDbRows = await db.getAll<UserChantRecord>(
        `SELECT * FROM user_chants WHERE deleted IS NOT 1 ORDER BY last_used DESC, total_count DESC`
      );
      customList = customDbRows.map(row => {
        knownChantIds.add(row.id);
        const stats = sessionStatsMap[row.id] || { totalCount: row.total_count || 0, lastUsed: row.last_used || 0 };
        return {
          id: row.id, // UUIDv7
          title: row.title,
          nameKey: row.name_key || undefined,
          isNamePali: row.is_name_pali !== undefined ? Boolean(row.is_name_pali) : true,
          chant: row.chant || undefined,
          content: row.chant || undefined,
          totalCount: Math.max(row.total_count || 0, stats.totalCount),
          lastUsed: Math.max(row.last_used || 0, stats.lastUsed),
          isCustom: true,
          milestone: row.milestone || 108
        };
      });
    } catch (err) {
      console.warn('[ChantService] Failed to fetch custom user chants from SQLite:', err);
    }

    // 3. Deleted custom chants or orphaned session chant IDs with stats
    const deletedList: UserChant[] = [];
    try {
      const deletedDbRows = await db.getAll<UserChantRecord>(
        `SELECT * FROM user_chants WHERE deleted = 1`
      );
      for (const row of deletedDbRows) {
        knownChantIds.add(row.id);
        const stats = sessionStatsMap[row.id] || { totalCount: row.total_count || 0, lastUsed: row.last_used || 0 };
        if (stats.totalCount > 0 || (row.total_count || 0) > 0) {
          deletedList.push({
            id: row.id,
            title: row.title || 'Unknown',
            nameKey: row.name_key || undefined,
            isNamePali: row.is_name_pali !== undefined ? Boolean(row.is_name_pali) : true,
            totalCount: Math.max(row.total_count || 0, stats.totalCount),
            lastUsed: Math.max(row.last_used || 0, stats.lastUsed),
            isCustom: true,
            isDeleted: true,
            milestone: 0
          });
        }
      }
    } catch (err) {
      console.warn('[ChantService] Failed to fetch deleted user chants:', err);
    }

    // Check for any orphaned chant IDs in sessionStatsMap not in knownChantIds
    for (const [chantId, stats] of Object.entries(sessionStatsMap)) {
      if (!knownChantIds.has(chantId) && stats.totalCount > 0) {
        deletedList.push({
          id: chantId,
          title: 'Unknown',
          nameKey: 'chant.unknown',
          isNamePali: false,
          totalCount: stats.totalCount,
          lastUsed: stats.lastUsed,
          isCustom: true,
          isDeleted: true,
          milestone: 0
        });
      }
    }

    const combined = [...defaultList, ...customList, ...deletedList];
    return combined.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
  }

  getLocalChants(): UserChant[] {
    // Deprecated sync call fallback
    return getLocal<UserChant[]>('app_user_chants', []);
  }

  async addChant(chant: Omit<UserChant, 'id' | 'totalCount'>): Promise<string> {
    await this.init();
    const newId = uuidv7();
    const nowMs = Date.now();
    const nowIso = new Date().toISOString();

    try {
      await db.execute(
        `INSERT INTO user_chants (id, title, name_key, is_name_pali, chant, total_count, last_used, is_custom, milestone, created_at, updated_at, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 0)`,
        [
          newId,
          chant.title,
          chant.nameKey || null,
          chant.isNamePali !== false ? 1 : 0,
          chant.content || chant.chant || null,
          0,
          nowMs,
          chant.milestone || 108,
          nowIso,
          nowIso
        ]
      );
    } catch (err) {
      console.error('[ChantService] Failed to save custom chant into SQLite:', err);
    }

    await this.notifyListeners();
    return newId;
  }

  async updateChant(chantId: string, updates: { title: string; content?: string; milestone?: number; isNamePali?: boolean }): Promise<void> {
    await this.init();
    const nowIso = new Date().toISOString();

    try {
      await db.execute(
        `UPDATE user_chants SET title = ?, chant = ?, milestone = ?, is_name_pali = ?, updated_at = ? WHERE id = ? AND is_custom = 1`,
        [
          updates.title,
          updates.content || null,
          updates.milestone || 108,
          updates.isNamePali !== false ? 1 : 0,
          nowIso,
          chantId
        ]
      );
    } catch (err) {
      console.error('[ChantService] Failed to update custom chant in SQLite:', err);
    }

    await this.notifyListeners();
  }

  async deleteChant(chantId: string): Promise<string> {
    await this.init();
    const nowIso = new Date().toISOString();
    try {
      await db.execute(
        `UPDATE user_chants SET deleted = 1, updated_at = ? WHERE id = ?`,
        [nowIso, chantId]
      );
    } catch (err) {
      console.error('[ChantService] Failed to delete custom chant in SQLite:', err);
    }

    await this.notifyListeners();
    const updated = await this.getUserChants();
    const active = updated.filter(c => !c.isDeleted);
    return active[0] ? active[0].id : '1';
  }

  async logSession(chantId: string, count: number, durationMin?: number): Promise<void> {
    await this.init();
    const newSessionId = uuidv7();
    const nowMs = Date.now();
    const nowIso = new Date().toISOString();

    try {
      await db.execute(
        `INSERT INTO chant_sessions (id, chant_id, count, timestamp, duration_min, created_at, updated_at, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          newSessionId,
          chantId,
          count,
          nowMs,
          durationMin ? durationMin : null,
          nowIso,
          nowIso
        ]
      );

      // If it is a custom chant in user_chants table, update its counter/last_used as well
      await db.execute(
        `UPDATE user_chants SET total_count = total_count + ?, last_used = ?, updated_at = ? WHERE id = ?`,
        [count, nowMs, nowIso, chantId]
      );
    } catch (err) {
      console.error('[ChantService] Failed to log chant session in SQLite:', err);
    }

    await this.notifyListeners();
  }

  subscribeToUserChants(callback: (chants: UserChant[]) => void): () => void {
    this.listeners.push(callback);
    this.getUserChants().then(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  async updateMilestone(chantId: string, milestone: number): Promise<void> {
    await this.init();
    const nowIso = new Date().toISOString();
    try {
      await db.execute(
        `UPDATE user_chants SET milestone = ?, updated_at = ? WHERE id = ?`,
        [milestone, nowIso, chantId]
      );
    } catch (err) {
      console.error('[ChantService] Failed to update milestone in SQLite:', err);
    }
    await this.notifyListeners();
  }

  async getSessionHistory(): Promise<ChantSession[]> {
    await this.init();
    try {
      const dbQueryPromise = db.getAll<ChantSessionRecord>(
        `SELECT * FROM chant_sessions WHERE deleted IS NOT 1 ORDER BY timestamp DESC`
      );
      const queryTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('SQLite query timeout')), 1500)
      );

      const result = await Promise.race([dbQueryPromise, queryTimeout]);
      return result.map(row => ({
        id: row.id,
        chantId: row.chant_id,
        count: row.count,
        timestamp: row.timestamp,
        durationMin: row.duration_min
      }));
    } catch (err) {
      console.warn('[ChantService] Failed to fetch session history from SQLite, falling back to localStorage:', err);
      const sessions = getLocal<ChantSession[]>('app_chant_sessions', []);
      return sessions.sort((a, b) => b.timestamp - a.timestamp);
    }
  }

  public async getAllRecordsForBackup(): Promise<{ chants: UserChantRecord[]; sessions: ChantSessionRecord[] }> {
    await this.init();
    const chants = await db.getAll<UserChantRecord>(`SELECT * FROM user_chants`);
    const sessions = await db.getAll<ChantSessionRecord>(`SELECT * FROM chant_sessions`);
    return { chants, sessions };
  }

  public async restoreBackupRecords(data: { chants?: UserChantRecord[]; sessions?: ChantSessionRecord[] }): Promise<void> {
    await this.init();
    if (Array.isArray(data.chants)) {
      for (const record of data.chants) {
        const id = record.id || uuidv7();
        await db.execute(
          `INSERT OR REPLACE INTO user_chants (id, title, name_key, is_name_pali, chant, total_count, last_used, is_custom, milestone, created_at, updated_at, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
          [
            id,
            record.title || '',
            record.name_key || null,
            record.is_name_pali !== undefined ? record.is_name_pali : 1,
            record.chant || null,
            record.total_count || 0,
            record.last_used || 0,
            record.milestone || 108,
            record.created_at || new Date().toISOString(),
            record.updated_at || new Date().toISOString(),
            record.deleted || 0
          ]
        );
      }
    }

    if (Array.isArray(data.sessions)) {
      for (const record of data.sessions) {
        const id = record.id || uuidv7();
        await db.execute(
          `INSERT OR REPLACE INTO chant_sessions (id, chant_id, count, timestamp, duration_min, created_at, updated_at, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            record.chant_id,
            record.count || 0,
            record.timestamp || Date.now(),
            record.duration_min !== undefined ? record.duration_min : null,
            record.created_at || new Date().toISOString(),
            record.updated_at || new Date().toISOString(),
            record.deleted || 0
          ]
        );
      }
    }
    await this.notifyListeners();
  }
}

export const chantService = ChantService.getInstance();
