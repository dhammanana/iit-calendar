import { Schema, Table, column } from '@powersync/web';

export const meditationSessionsTable = new Table({
  date: column.text,
  duration_min: column.integer,
  created_at: column.text,
  updated_at: column.text,
  deleted: column.integer
});

export const AppSchemaDefinition = new Schema({
  meditation_sessions: meditationSessionsTable
});

export type MeditationSessionRecord = {
  id: string;
  date: string;
  duration_min: number;
  created_at: string;
  updated_at: string;
  deleted?: number;
};
