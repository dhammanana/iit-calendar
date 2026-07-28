export type CalendarType = 'myanmar' | 'thai' | 'srilanka' | 'lunar';
export type PaliScript = 'roman' | 'sinhala' | 'burmese' | 'thai' | 'devanagari' | 'lao' | 'khmer' | 'bengali' | 'gurmukhi' | 'gujarati' | 'telugu' | 'kannada' | 'malayalam' | 'taitham' | 'brahmi' | 'tibetan' | 'cyrillic' | 'assamese';
export type ThemeColor = 'saffron' | 'indigo' | 'emerald' | 'rose' | 'slate';
export type FontSize = number;

export interface Settings {
  calendarType: CalendarType;
  lat: number;
  lng: number;
  address?: string;
  dawnMethod: string;
  dawnAngle?: number;
  dawnDurationOffset?: number;
  language: string;
  paliScript: PaliScript;
  themeColor: ThemeColor;
  darkMode: boolean;
  fontSize: FontSize;
  solarNoonBell: boolean;
  noonSafeOffset?: number;
  noonMultiAlert?: boolean;
  noonVoiceAlert?: boolean;
  dawnBell: boolean;
  syncToFirebase: boolean;
  isIITStudent?: boolean;
  calendarCardOrder?: string[];
}

export interface Chant {
  id: string;
  title: string;
  nameKey?: string;
  isNamePali?: boolean;
  content?: string;
  chant?: string;
  category?: string;
}

export interface UserChant extends Chant {
  totalCount: number;
  lastUsed?: number; // timestamp
  isCustom?: boolean;
  isDeleted?: boolean;
  milestone?: number;
}

export interface ChantSession {
  id: string;
  chantId: string;
  count: number;
  timestamp: number;
  durationMin?: number;
}

export interface UserChantStats {
  totalSessions: number;
  streakDays: number;
  lastSessionDate?: string;
  distribution: Record<string, number>; // chantId -> total count
}

export interface MeditationSession {
  id: string;
  date: string;
  durationMin: number;
}
export * from './book';
