import { PowerSyncDatabase } from '@powersync/web';
import { AppSchemaDefinition } from './schema';

export const db = new PowerSyncDatabase({
  schema: AppSchemaDefinition,
  database: {
    dbFilename: 'iit_calendar.db'
  }
});

let isInitialized = false;

export async function initPowerSync(): Promise<PowerSyncDatabase> {
  if (!isInitialized) {
    try {
      await db.init();
      isInitialized = true;
    } catch (err) {
      console.error('Failed to initialize PowerSync database:', err);
    }
  }
  return db;
}
