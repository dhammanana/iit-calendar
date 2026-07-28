import { Schema, Table, column } from '@powersync/web';

export const meditationSessionsTable = new Table({
  date: column.text,
  duration_min: column.integer,
  created_at: column.text,
  updated_at: column.text,
  deleted: column.integer
});

export const userChantsTable = new Table({
  title: column.text,
  name_key: column.text,
  is_name_pali: column.integer,
  chant: column.text,
  total_count: column.integer,
  last_used: column.integer,
  is_custom: column.integer,
  milestone: column.integer,
  created_at: column.text,
  updated_at: column.text,
  deleted: column.integer
});

export const chantSessionsTable = new Table({
  chant_id: column.text,
  count: column.integer,
  timestamp: column.integer,
  duration_min: column.integer,
  created_at: column.text,
  updated_at: column.text,
  deleted: column.integer
});

export const studySessionsTable = new Table({
  date: column.text,
  duration_ms: column.integer,
  created_at: column.text,
  updated_at: column.text,
  deleted: column.integer
});

export const studyTasksTable = new Table({
  name: column.text,
  est: column.integer,
  act: column.integer,
  completed: column.integer,
  is_active: column.integer,
  created_at: column.text,
  updated_at: column.text,
  deleted: column.integer
});

export const AppSchemaDefinition = new Schema({
  meditation_sessions: meditationSessionsTable,
  user_chants: userChantsTable,
  chant_sessions: chantSessionsTable,
  study_sessions: studySessionsTable,
  study_tasks: studyTasksTable
});

export type MeditationSessionRecord = {
  id: string;
  date: string;
  duration_min: number;
  created_at: string;
  updated_at: string;
  deleted?: number;
};

export type UserChantRecord = {
  id: string;
  title: string;
  name_key?: string;
  is_name_pali?: number;
  chant?: string;
  total_count: number;
  last_used?: number;
  is_custom?: number;
  milestone?: number;
  created_at: string;
  updated_at: string;
  deleted?: number;
};

export type ChantSessionRecord = {
  id: string;
  chant_id: string;
  count: number;
  timestamp: number;
  duration_min?: number;
  created_at: string;
  updated_at: string;
  deleted?: number;
};

export type StudySessionRecord = {
  id: string;
  date: string;
  duration_ms: number;
  created_at: string;
  updated_at: string;
  deleted?: number;
};

export type StudyTaskRecord = {
  id: string;
  name: string;
  est: number;
  act: number;
  completed: number;
  is_active?: number;
  created_at: string;
  updated_at: string;
  deleted?: number;
};
