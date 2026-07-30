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
  // near-black + saffron-gold
  // ─────────────────────────────────────────────────────────────────────────

  // Backgrounds
  darkBg:              'rgb(14 10 6)',
  darkSurface:         'rgb(24 17 8 / 0.95)',
  darkSurfaceHover:    'rgb(212 136 32 / 0.06)',
  darkCardBg:          'rgb(30 22 12 / 0.90)',
  darkSelectBg:        'rgb(24 17 8)',
  darkOverlay:         'rgb(0 0 0 / 0.55)',

  // Borders
  darkBorder:          'rgb(60 45 22)',
  darkInputBorder:     'rgb(60 45 22)',

  // Text
  darkTextPrimary:     'rgb(250 240 220)',
  darkTextSecondary:   'rgb(180 150 100)',
  darkTextMuted:       'rgb(120 100 65)',
  darkTextDisabled:    'rgb(80 65 40)',

  // Indicators
  darkTodayDot:        'rgb(212 136 32 / 0.35)',
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
  @font-face { src: url('/fonts/sinhala/NotoSerifSinhala-Regular.ttf') format('truetype'); font-weight: normal; font-family: 'sinhala'; }
  @font-face { src: url('/fonts/sinhala/NotoSerifSinhala-Bold.ttf') format('truetype'); font-weight: bold; font-family: 'sinhala'; }

  @font-face { src: url('/fonts/devanagari/NotoSerifDevanagari-Regular.ttf') format('truetype'); font-weight: normal; font-family: 'devanagari'; }
  @font-face { src: url('/fonts/devanagari/NotoSerifDevanagari-Bold.ttf') format('truetype'); font-weight: bold; font-family: 'devanagari'; }

  @font-face { src: url('/fonts/roman/NotoSerif-Regular.ttf') format('truetype'); font-weight: normal; font-family: 'roman'; }
  @font-face { src: url('/fonts/roman/NotoSerif-Bold.ttf') format('truetype'); font-weight: bold; font-family: 'roman'; }

  @font-face { src: url('/fonts/thai/THSarabunNew.ttf') format('truetype'); font-weight: normal; font-family: 'thai'; }
  @font-face { src: url('/fonts/thai/THSarabunNew-Bold.ttf') format('truetype'); font-weight: bold; font-family: 'thai'; }

  @font-face { src: url('/fonts/lao/LaoPaliAlpha-Light.woff') format('woff'); font-weight: 300; font-family: 'lao'; }
  @font-face { src: url('/fonts/lao/LaoPaliAlpha-Regular.woff') format('woff'); font-weight: normal; font-family: 'lao'; }
  @font-face { src: url('/fonts/lao/Lanexang Mon2.woff') format('woff'); font-weight: normal; font-family: 'lao-ui'; }

  @font-face { src: url('/fonts/myanmar/mm3-multi-os(16-08-2011).ttf') format('truetype'); font-weight: normal; font-family: 'myanmar'; }
  @font-face { src: url('/fonts/myanmar/mm3-multi-os(16-08-2011).ttf') format('truetype'); font-weight: bold; font-family: 'myanmar'; }

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

  .UT[lang=en] { font-family: 'roman'; }
  .UT[lang=si] { font-family: 'sinhala'; line-height: 1.5rem; }
  .UT[lang=km] { font-family: 'khmer'; }
  .UT[lang=vi] { font-family: 'roman'; }
  .UT[lang=ch] { font-family: 'roman';}
  .UT[lang=hi] { font-family: 'devanagari';}
  .UT[lang=th] { font-family: 'thai'; font-size: 1.5rem; line-height: 1.7rem; }
  .UT[lang=lo] { font-family: 'lao-ui', 'lao'; font-size: 1.2rem; line-height: 1.5rem; }
  .UT[lang=my] { font-family: 'myanmar';}
  .UT[lang=in],.UT[lang=es],.UT[lang=pt] { font-family: 'roman';}

  .PT[script=si],.tab-content[script=si],.book-container[script=si] { font-family: 'sinhala'; line-height: 1.5rem; }
  .PT[script=hi],.tab-content[script=hi],.book-container[script=hi] { font-family: 'devanagari'; }
  .PT[script=ro],.tab-content[script=ro],.book-container[script=ro] { font-family: 'roman'; }
  .PT[script=th],.tab-content[script=th],.book-container[script=th] { font-family: 'thai'; font-size: 1.5rem; line-height: 1.7rem; }
  .PT[script=lo],.tab-content[script=lo],.book-container[script=lo] { font-family: 'lao'; line-height: 170%; }
  .PT[script=my],.tab-content[script=my],.book-container[script=my] { font-family: 'myanmar'; }
  .PT[script=km],.tab-content[script=km],.book-container[script=km] { font-family: 'khmer'; }
  .PT[script=be],.tab-content[script=be],.book-container[script=be] { font-family: 'bengali'; }
  .PT[script=as],.tab-content[script=as],.book-container[script=as] { font-family: 'bengali'; }
  .PT[script=gm],.tab-content[script=gm],.book-container[script=gm] { font-family: 'gurmukhi'; }
  .PT[script=tt],.tab-content[script=tt],.book-container[script=tt] { font-family: 'tai tham'; font-size: 1.5rem; }
  .PT[script=gj],.tab-content[script=gj],.book-container[script=gj] { font-family: 'gujarati'; }
  .PT[script=te],.tab-content[script=te],.book-container[script=te] { font-family: 'telugu'; }
  .PT[script=ka],.tab-content[script=ka],.book-container[script=ka] { font-family: 'kannada'; }
  .PT[script=mm],.tab-content[script=mm],.book-container[script=mm] { font-family: 'malayalam'; }
  .PT[script=br],.tab-content[script=br],.book-container[script=br] { font-family: 'brahmi'; }
  .PT[script=tb],.tab-content[script=tb],.book-container[script=tb] { font-family: 'tibetan'; }
  .PT[script=cy],.tab-content[script=cy],.book-container[script=cy] { font-family: 'cyrillic'; }

  .PT .english { font-style: italic; }
  .PT .pali { font-style: normal; }
`;

export {COLOR_TOKENS, CSS_VARS}