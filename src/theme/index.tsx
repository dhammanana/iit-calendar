// ─────────────────────────────────────────────────────────────────────────────
// Unified Color Tokens
// Combines:
// - Calendar theme tokens
// - Settings modal tokens
// - Lotus / uposatha indicators
// - Light + dark semantic surfaces
// ─────────────────────────────────────────────────────────────────────────────

const COLOR_TOKENS = {
  // ── ACCENT / BRAND ───────────────────────────────────────────────────────
  accentBase:          'rgb(212 136 32)',
  accentMuted:         'rgb(212 136 32 / 0.15)',
  accentSubtle:        'rgb(212 136 32 / 0.08)',
  accentShadow:        'rgb(212 136 32 / 0.30)',
  accentText:          'rgb(212 136 32)',

  // ── LOTUS / ROSE ────────────────────────────────────────────────────────
  lotusBase:           'rgb(188 71 123)',
  lotusMuted:          'rgb(188 71 123 / 0.12)',
  lotusShadow:         'rgb(188 71 123 / 0.08)',

  darkLotusBase:       'rgb(240 120 160)',
  darkLotusMuted:      'rgb(240 120 160 / 0.12)',
  darkLotusShadow:     'rgb(240 120 160 / 0.08)',

  // ─────────────────────────────────────────────────────────────────────────
  // LIGHT MODE
  // warm cream + golden-brown
  // ─────────────────────────────────────────────────────────────────────────

  // Backgrounds
  lightBg:             'rgb(255 249 242)',
  lightSurface:        'rgb(255 255 255 / 0.92)',
  lightSurfaceHover:   'rgb(212 136 32 / 0.06)',
  lightCardBg:         'rgb(255 255 255 / 0.80)',
  lightSelectBg:       'rgb(255 249 242)',
  lightOverlay:        'rgb(0 0 0 / 0.35)',

  // Borders
  lightBorder:         'rgb(220 200 170 / 0.60)',
  lightInputBorder:    'rgb(210 190 160)',

  // Text
  lightTextPrimary:    'rgb(30 20 10)',
  lightTextSecondary:  'rgb(100 80 55)',
  lightTextMuted:      'rgb(150 120 80)',
  lightTextDisabled:   'rgb(190 170 140)',

  // Indicators
  lightTodayDot:       'rgb(212 136 32 / 0.40)',

  // ─────────────────────────────────────────────────────────────────────────
  // DARK MODE
  // rich warm obsidian + vibrant golden-saffron
  // ─────────────────────────────────────────────────────────────────────────

  // Backgrounds
  darkBg:              'rgb(12 10 9)',
  darkSurface:         'rgb(26 22 18 / 0.95)',
  darkSurfaceHover:    'rgb(232 172 65 / 0.10)',
  darkCardBg:          'rgb(34 29 24 / 0.90)',
  darkSelectBg:        'rgb(26 22 18)',
  darkOverlay:         'rgb(0 0 0 / 0.70)',

  // Borders
  darkBorder:          'rgb(80 68 54 / 0.60)',
  darkInputBorder:     'rgb(80 68 54)',

  // Text
  darkTextPrimary:     'rgb(250 244 232)',
  darkTextSecondary:   'rgb(226 213 195)',
  darkTextMuted:       'rgb(181 164 142)',
  darkTextDisabled:    'rgb(130 114 94)',

  // Indicators
  darkTodayDot:        'rgb(232 172 65 / 0.40)',
};

const CSS_VARS = `
  :root {
    --sm-accent:           ${COLOR_TOKENS.accentBase};
    --sm-accent-muted:     ${COLOR_TOKENS.accentMuted};
    --sm-accent-subtle:    ${COLOR_TOKENS.accentSubtle};
    --sm-accent-shadow:    ${COLOR_TOKENS.accentShadow};

    --sm-bg:               ${COLOR_TOKENS.lightBg};
    --sm-surface:          ${COLOR_TOKENS.lightSurface};
    --sm-card-bg:          ${COLOR_TOKENS.lightCardBg};
    --sm-border:           ${COLOR_TOKENS.lightBorder};
    --sm-input-border:     ${COLOR_TOKENS.lightInputBorder};
    --sm-select-bg:        ${COLOR_TOKENS.lightSelectBg};

    --sm-text-primary:     ${COLOR_TOKENS.lightTextPrimary};
    --sm-text-secondary:   ${COLOR_TOKENS.lightTextSecondary};
    --sm-text-muted:       ${COLOR_TOKENS.lightTextMuted};
    --sm-text-disabled:    ${COLOR_TOKENS.lightTextDisabled};
    --sm-overlay:          ${COLOR_TOKENS.lightOverlay};
  }

  .dark {
    --sm-bg:               ${COLOR_TOKENS.darkBg};
    --sm-surface:          ${COLOR_TOKENS.darkSurface};
    --sm-card-bg:          ${COLOR_TOKENS.darkCardBg};
    --sm-border:           ${COLOR_TOKENS.darkBorder};
    --sm-input-border:     ${COLOR_TOKENS.darkInputBorder};
    --sm-select-bg:        ${COLOR_TOKENS.darkSelectBg};

    --sm-text-primary:     ${COLOR_TOKENS.darkTextPrimary};
    --sm-text-secondary:   ${COLOR_TOKENS.darkTextSecondary};
    --sm-text-muted:       ${COLOR_TOKENS.darkTextMuted};
    --sm-text-disabled:    ${COLOR_TOKENS.darkTextDisabled};
    --sm-overlay:          ${COLOR_TOKENS.darkOverlay};
  }

  /* Pali Font Definitions */
  /* Sinhala: Serif for scripture, Sans for UI */
  @font-face { src: url('/fonts/sinhala/NotoSerifSinhala-Regular.ttf') format('truetype'); font-weight: normal; font-family: 'sinhala'; }
  @font-face { src: url('/fonts/sinhala/NotoSerifSinhala-Bold.ttf') format('truetype'); font-weight: bold; font-family: 'sinhala'; }
  @font-face { src: url('/fonts/sinhala/NotoSansSinhala-Regular.ttf') format('truetype'); font-weight: normal; font-family: 'sinhala-sans'; }
  @font-face { src: url('/fonts/sinhala/NotoSansSinhala-Bold.ttf') format('truetype'); font-weight: bold; font-family: 'sinhala-sans'; }

  /* Devanagari: Serif for scripture, Sans for UI */
  @font-face { src: url('/fonts/devanagari/NotoSerifDevanagari-Regular.ttf') format('truetype'); font-weight: normal; font-family: 'devanagari'; }
  @font-face { src: url('/fonts/devanagari/NotoSerifDevanagari-Bold.ttf') format('truetype'); font-weight: bold; font-family: 'devanagari'; }
  @font-face { src: url('/fonts/devanagari/NotoSansDevanagari-Regular.ttf') format('truetype'); font-weight: normal; font-family: 'devanagari-sans'; }
  @font-face { src: url('/fonts/devanagari/NotoSansDevanagari-Bold.ttf') format('truetype'); font-weight: bold; font-family: 'devanagari-sans'; }

  @font-face { src: url('/fonts/roman/NotoSerif-Regular.ttf') format('truetype'); font-weight: normal; font-family: 'roman'; }
  @font-face { src: url('/fonts/roman/NotoSerif-Bold.ttf') format('truetype'); font-weight: bold; font-family: 'roman'; }

  @font-face { src: url('/fonts/thai/THSarabunNew.ttf') format('truetype'); font-weight: normal; font-family: 'thai'; }
  @font-face { src: url('/fonts/thai/THSarabunNew-Bold.ttf') format('truetype'); font-weight: bold; font-family: 'thai'; }

  @font-face { src: url('/fonts/lao/LaoPaliAlpha-Light.woff') format('woff'); font-weight: 300; font-family: 'lao'; }
  @font-face { src: url('/fonts/lao/LaoPaliAlpha-Regular.woff') format('woff'); font-weight: normal; font-family: 'lao'; }
  @font-face { src: url('/fonts/lao/Lanexang Mon2.woff') format('woff'); font-weight: normal; font-family: 'lao-ui'; }

  @font-face { src: url('/fonts/myanmar/Pyidaungsu-2.4-Regular.ttf') format('truetype'); font-weight: normal; font-family: 'myanmar'; }
  @font-face { src: url('/fonts/myanmar/Pyidaungsu-2.4-Bold.ttf') format('truetype'); font-weight: bold; font-family: 'myanmar'; }

  @font-face { src: url('/fonts/khmer/NotoSerifKhmer-Regular.ttf') format('truetype'); font-weight: normal; font-family: 'khmer'; }
  @font-face { src: url('/fonts/khmer/NotoSerifKhmer-Bold.ttf') format('truetype'); font-weight: bold; font-family: 'khmer'; }

  @font-face { src: url('/fonts/bengali/NotoSerifBengali-Regular.ttf') format('truetype'); font-weight: normal; font-family: 'bengali'; }
  @font-face { src: url('/fonts/bengali/NotoSerifBengali-Bold.ttf') format('truetype'); font-weight: bold; font-family: 'bengali'; }

  @font-face { src: url('/fonts/gurmukhi/NotoSansGurmukhi-Regular.ttf') format('truetype'); font-weight: normal; font-family: 'gurmukhi'; }
  @font-face { src: url('/fonts/gurmukhi/NotoSansGurmukhi-Bold.ttf') format('truetype'); font-weight: bold; font-family: 'gurmukhi'; }

  @font-face { src: url('/fonts/lanna/Hariphunchai.otf') format('opentype'); font-weight: normal; font-family: 'tai tham'; }
  @font-face { src: url('/fonts/lanna/Hariphunchai.otf') format('opentype'); font-weight: bold; font-family: 'tai tham'; }

  @font-face { src: url('/fonts/gujarati/NotoSerifGujarati-Regular.ttf') format('truetype'); font-weight: normal; font-family: 'gujarati'; }
  @font-face { src: url('/fonts/gujarati/NotoSerifGujarati-Bold.ttf') format('truetype'); font-weight: bold; font-family: 'gujarati'; }

  @font-face { src: url('/fonts/telugu/NotoSerifTelugu-Regular.ttf') format('truetype'); font-weight: normal; font-family: 'telugu'; }
  @font-face { src: url('/fonts/telugu/NotoSerifTelugu-Bold.ttf') format('truetype'); font-weight: bold; font-family: 'telugu'; }

  @font-face { src: url('/fonts/kannada/NotoSerifKannada-Regular.ttf') format('truetype'); font-weight: normal; font-family: 'kannada'; }
  @font-face { src: url('/fonts/kannada/NotoSerifKannada-Bold.ttf') format('truetype'); font-weight: bold; font-family: 'kannada'; }

  @font-face { src: url('/fonts/malayalam/NotoSerifMalayalam-Regular.ttf') format('truetype'); font-weight: normal; font-family: 'malayalam'; }
  @font-face { src: url('/fonts/malayalam/NotoSerifMalayalam-Bold.ttf') format('truetype'); font-weight: bold; font-family: 'malayalam'; }

  @font-face { src: url('/fonts/brahmi/NotoSansBrahmi-Regular.ttf') format('truetype'); font-weight: normal; font-family: 'brahmi'; }

  @font-face { src: url('/fonts/tibetian/NotoSansTibetan-Regular.ttf') format('truetype'); font-weight: normal; font-family: 'tibetan'; }
  @font-face { src: url('/fonts/tibetian/NotoSansTibetan-Bold.ttf') format('truetype'); font-weight: bold; font-family: 'tibetan'; }

  @font-face { src: url('/fonts/roman/NotoSerif-Regular.ttf') format('truetype'); font-weight: normal; font-family: 'cyrillic'; }
  @font-face { src: url('/fonts/roman/NotoSerif-Bold.ttf') format('truetype'); font-weight: bold; font-family: 'cyrillic'; }

  /* ── UI Text (.UT) — Sans-Serif for maximum interface clarity ── */
  .UT[lang=en] { font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif; }
  .UT[lang=si], .UT[lang=si] * { font-family: 'sinhala-sans', 'Noto Sans Sinhala', sans-serif; line-height: 1.5rem; }
  .UT[lang=km], .UT[lang=km] * { font-family: 'Noto Sans Khmer', 'khmer', sans-serif; }
  .UT[lang=vi], .UT[lang=ch], .UT[lang=in], .UT[lang=es], .UT[lang=pt] { font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif; }
  .UT[lang=hi], .UT[lang=hi] * { font-family: 'devanagari-sans', 'Noto Sans Devanagari', sans-serif; }
  .UT[lang=th], .UT[lang=th] * { font-family: 'Noto Sans Thai', 'thai', sans-serif; }
  .UT[lang=lo], .UT[lang=lo] * { font-family: 'lao-ui', 'lao', sans-serif; font-size: 1.15rem; line-height: 1.5rem; }
  .UT[lang=my], .UT[lang=my] * { font-family: 'Noto Sans Myanmar', 'myanmar', 'Pyidaungsu', sans-serif; }

  /* ── UI Language font classes (Sans-Serif for interface language selection) ── */
  .lang-ui-en { font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif !important; }
  .lang-ui-vi { font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif !important; }
  .lang-ui-th { font-family: 'Noto Sans Thai', 'thai', sans-serif !important; }
  .lang-ui-si { font-family: 'sinhala-sans', 'Noto Sans Sinhala', sans-serif !important; }
  .lang-ui-my { font-family: 'Noto Sans Myanmar', 'myanmar', 'Pyidaungsu', sans-serif !important; }
  .lang-ui-km { font-family: 'Noto Sans Khmer', 'khmer', sans-serif !important; }
  .lang-ui-lo { font-family: 'lao-ui', 'lao', sans-serif !important; }
  .lang-ui-hi { font-family: 'devanagari-sans', 'Noto Sans Devanagari', sans-serif !important; }

  /* ── Pali Script font classes (Serif / Canonical book face for script selection) ── */
  .script-font-roman, .script-font-en, .lang-font-en { font-family: 'roman', 'Noto Serif', serif !important; }
  .script-font-sinhala, .script-font-si, .lang-font-si { font-family: 'sinhala', 'Noto Serif Sinhala', serif !important; }
  .script-font-burmese, .script-font-my, .lang-font-my { font-family: 'myanmar', 'Pyidaungsu', serif !important; }
  .script-font-thai, .script-font-th, .lang-font-th { font-family: 'thai', 'THSarabunNew', serif !important; }
  .script-font-devanagari, .script-font-hi, .lang-font-hi { font-family: 'devanagari', 'Noto Serif Devanagari', serif !important; }
  .script-font-lao, .script-font-lo, .lang-font-lo { font-family: 'lao', 'LaoPaliAlpha', serif !important; }
  .script-font-khmer, .script-font-km, .lang-font-km { font-family: 'khmer', 'Noto Serif Khmer', serif !important; }
  .script-font-bengali, .script-font-bn, .lang-font-bn { font-family: 'bengali', 'Noto Serif Bengali', serif !important; }
  .script-font-gurmukhi, .script-font-pa, .lang-font-pa { font-family: 'gurmukhi', 'Noto Sans Gurmukhi', sans-serif !important; }
  .script-font-gujarati, .script-font-gu, .lang-font-gu { font-family: 'gujarati', 'Noto Serif Gujarati', serif !important; }
  .script-font-telugu, .script-font-te, .lang-font-te { font-family: 'telugu', 'Noto Serif Telugu', serif !important; }
  .script-font-kannada, .script-font-kn, .lang-font-kn { font-family: 'kannada', 'Noto Serif Kannada', serif !important; }
  .script-font-malayalam, .script-font-ml, .lang-font-ml { font-family: 'malayalam', 'Noto Serif Malayalam', serif !important; }
  .script-font-taitham, .script-font-nod, .lang-font-nod { font-family: 'tai tham', 'Hariphunchai', serif !important; }
  .script-font-brahmi, .script-font-pra, .lang-font-pra { font-family: 'brahmi', 'Noto Sans Brahmi', sans-serif !important; }
  .script-font-tibetan, .script-font-bo, .lang-font-bo { font-family: 'tibetan', 'Noto Sans Tibetan', sans-serif !important; }
  .script-font-cyrillic, .script-font-ru, .lang-font-ru { font-family: 'cyrillic', 'Noto Serif', serif !important; }
  .script-font-assamese, .script-font-as, .lang-font-as { font-family: 'bengali', 'Noto Serif Bengali', serif !important; }

  /* ── Pali Scripture & Literature (.PT) — Serif / Canonical Book Face ── */
  .PT[script=si],.tab-content[script=si],.book-container[script=si],
  .PT[script=si] *, .tab-content[script=si] *, .book-container[script=si] * { font-family: 'sinhala', 'Noto Serif Sinhala', serif; line-height: 1.5rem; }
  .PT[script=hi],.tab-content[script=hi],.book-container[script=hi],
  .PT[script=hi] *, .tab-content[script=hi] *, .book-container[script=hi] * { font-family: 'devanagari', 'Noto Serif Devanagari', serif; }
  .PT[script=ro],.tab-content[script=ro],.book-container[script=ro],
  .PT[script=ro] *, .tab-content[script=ro] *, .book-container[script=ro] * { font-family: 'roman', 'Noto Serif', serif; }
  .PT[script=th],.tab-content[script=th],.book-container[script=th],
  .PT[script=th] *, .tab-content[script=th] *, .book-container[script=th] * { font-family: 'thai', 'THSarabunNew', serif; font-size: 1.5rem; line-height: 1.7rem; }
  .PT[script=lo],.tab-content[script=lo],.book-container[script=lo],
  .PT[script=lo] *, .tab-content[script=lo] *, .book-container[script=lo] * { font-family: 'lao', 'LaoPaliAlpha', serif; line-height: 170%; }
  .PT[script=my],.tab-content[script=my],.book-container[script=my],
  .PT[script=my] *, .tab-content[script=my] *, .book-container[script=my] * { font-family: 'myanmar', 'Pyidaungsu', serif; }
  .PT[script=km],.tab-content[script=km],.book-container[script=km],
  .PT[script=km] *, .tab-content[script=km] *, .book-container[script=km] * { font-family: 'khmer', 'Noto Serif Khmer', serif; }
  .PT[script=be],.tab-content[script=be],.book-container[script=be],
  .PT[script=be] *, .tab-content[script=be] *, .book-container[script=be] * { font-family: 'bengali', 'Noto Serif Bengali', serif; }
  .PT[script=as],.tab-content[script=as],.book-container[script=as],
  .PT[script=as] *, .tab-content[script=as] *, .book-container[script=as] * { font-family: 'bengali', 'Noto Serif Bengali', serif; }
  .PT[script=gm],.tab-content[script=gm],.book-container[script=gm],
  .PT[script=gm] *, .tab-content[script=gm] *, .book-container[script=gm] * { font-family: 'gurmukhi', 'Noto Sans Gurmukhi', sans-serif; }
  .PT[script=tt],.tab-content[script=tt],.book-container[script=tt],
  .PT[script=tt] *, .tab-content[script=tt] *, .book-container[script=tt] * { font-family: 'tai tham', 'Hariphunchai', serif; font-size: 1.5rem; }
  .PT[script=gj],.tab-content[script=gj],.book-container[script=gj],
  .PT[script=gj] *, .tab-content[script=gj] *, .book-container[script=gj] * { font-family: 'gujarati', 'Noto Serif Gujarati', serif; }
  .PT[script=te],.tab-content[script=te],.book-container[script=te],
  .PT[script=te] *, .tab-content[script=te] *, .book-container[script=te] * { font-family: 'telugu', 'Noto Serif Telugu', serif; }
  .PT[script=ka],.tab-content[script=ka],.book-container[script=ka],
  .PT[script=ka] *, .tab-content[script=ka] *, .book-container[script=ka] * { font-family: 'kannada', 'Noto Serif Kannada', serif; }
  .PT[script=mm],.tab-content[script=mm],.book-container[script=mm],
  .PT[script=mm] *, .tab-content[script=mm] *, .book-container[script=mm] * { font-family: 'malayalam', 'Noto Serif Malayalam', serif; }
  .PT[script=br],.tab-content[script=br],.book-container[script=br],
  .PT[script=br] *, .tab-content[script=br] *, .book-container[script=br] * { font-family: 'brahmi', 'Noto Sans Brahmi', sans-serif; }
  .PT[script=tb],.tab-content[script=tb],.book-container[script=tb],
  .PT[script=tb] *, .tab-content[script=tb] *, .book-container[script=tb] * { font-family: 'tibetan', 'Noto Sans Tibetan', sans-serif; }
  .PT[script=cy],.tab-content[script=cy],.book-container[script=cy],
  .PT[script=cy] *, .tab-content[script=cy] *, .book-container[script=cy] * { font-family: 'cyrillic', 'Noto Serif', serif; }

  .PT .english { font-style: italic; }
  .PT .pali { font-style: normal; }

  /* Disable letter-spacing and uppercase text-transform for complex scripts where tracking breaks OpenType shaping */
  :lang(my), [lang="my"], [lang="my"] *, .lang-font-my, .lang-ui-my, .script-font-my, .script-font-burmese,
  :lang(km), [lang="km"], [lang="km"] *, .lang-font-km, .lang-ui-km, .script-font-km, .script-font-khmer,
  :lang(th), [lang="th"], [lang="th"] *, .lang-font-th, .lang-ui-th, .script-font-th, .script-font-thai,
  :lang(lo), [lang="lo"], [lang="lo"] *, .lang-font-lo, .lang-ui-lo, .script-font-lo, .script-font-lao,
  :lang(si), [lang="si"], [lang="si"] *, .lang-font-si, .lang-ui-si, .script-font-si, .script-font-sinhala,
  :lang(hi), [lang="hi"], [lang="hi"] *, .lang-font-hi, .lang-ui-hi, .script-font-hi, .script-font-devanagari,
  :lang(bn), [lang="bn"], [lang="bn"] *, .lang-font-bn, .script-font-bn, .script-font-bengali,
  :lang(pa), [lang="pa"], [lang="pa"] *, .lang-font-pa, .script-font-pa, .script-font-gurmukhi,
  :lang(gu), [lang="gu"], [lang="gu"] *, .lang-font-gu, .script-font-gu, .script-font-gujarati,
  :lang(te), [lang="te"], [lang="te"] *, .lang-font-te, .script-font-te, .script-font-telugu,
  :lang(kn), [lang="kn"], [lang="kn"] *, .lang-font-kn, .script-font-kn, .script-font-kannada,
  :lang(ml), [lang="ml"], [lang="ml"] *, .lang-font-ml, .script-font-ml, .script-font-malayalam,
  :lang(nod), [lang="nod"], [lang="nod"] *, .lang-font-nod, .script-font-nod, .script-font-taitham,
  :lang(pra), [lang="pra"], [lang="pra"] *, .lang-font-pra, .script-font-pra, .script-font-brahmi,
  :lang(bo), [lang="bo"], [lang="bo"] *, .lang-font-bo, .script-font-bo, .script-font-tibetan,
  :lang(as), [lang="as"], [lang="as"] *, .lang-font-as, .script-font-as, .script-font-assamese,
  .PT[script="my"], .PT[script="my"] *,
  .PT[script="km"], .PT[script="km"] *,
  .PT[script="th"], .PT[script="th"] *,
  .PT[script="lo"], .PT[script="lo"] *,
  .PT[script="si"], .PT[script="si"] * {
    letter-spacing: normal !important;
    text-transform: none !important;
  }
`;

export {COLOR_TOKENS, CSS_VARS}