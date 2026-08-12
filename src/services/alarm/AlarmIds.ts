
export const enum AlarmId {
  MEDITATION_START     = 1099,
  MEDITATION_END       = 1000,
  MEDITATION_INTERVAL  = 1100,   // 1100–1199, one per interval slot
  SOLAR_NOON_START     = 2000,   // 2000–2300, supports multiple alerts per day
  DAWN_START           = 3000,   // 3000–3029, one per day
  STUDY_END            = 4000,
  STUDY_INTERVAL       = 4100,   // 4100–4199
}
