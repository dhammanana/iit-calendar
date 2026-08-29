const ERA_DAYS      = 292207;
const ERA_HORAKHUN  = 373;
const MONTH_LENGTH  = 30;
const CYCLE_SOLAR   = 692;
const CYCLE_DAILY   = 11;
const KAMMACUBALA_DAILY = 800;
const CS_DIFF       = 638;
const BE_DIFF       = 543;

export const MONTH_NAMES = {
  1: "Māgasira", 2: "Phussa",    3: "Māgha",   4: "Phagguṇa",
  5: "Citta",    6: "Visākha",   7: "Jeṭṭha",  8: "Āsāḷha",
  9: "Savaṇa",  10: "Bhaddapāda",11:"Assayuja",12: "Kattika",
 13: "2nd Āsāḷha",
};

export const SEASON_NAMES = {
  1: "hemanta",
  2: "gimhāna",
  3: "vassāna",
};

const KATTIKA_EPOCH = new Date(2015, 10, 25);

function calYear(ce) {
  const cs = ce - CS_DIFF;
  const a  = cs * ERA_DAYS + ERA_HORAKHUN;
  const horakhun    = Math.floor(a / KAMMACUBALA_DAILY + 1);
  const kammacubala = KAMMACUBALA_DAILY - (a % KAMMACUBALA_DAILY);
  const ai          = horakhun * CYCLE_DAILY + 650;
  const avoman      = ai % CYCLE_SOLAR;
  const bi          = Math.floor(ai / CYCLE_SOLAR) + horakhun;
  const tithi       = bi % MONTH_LENGTH;
  return { ce, cs, horakhun, kammacubala, avoman, tithi };
}

function wouldBeAdhikamasa(yr) {
  const t = yr.tithi;
  return (t >= 24 && t <= 29) || (t >= 0 && t <= 5);
}

function isAdhikamasa(ce) {
  return wouldBeAdhikamasa(calYear(ce)) && !wouldBeAdhikamasa(calYear(ce + 1));
}

function wouldBeAdhikavara(yr) {
  return yr.kammacubala <= 207 ? yr.avoman <= 126 : yr.avoman < 137;
}

function isAdhikavara(ce) {
  if (isAdhikamasa(ce)) return false;
  if (isAdhikamasa(ce - 1) && wouldBeAdhikavara(calYear(ce-1))) return true;
  return wouldBeAdhikavara(calYear(ce));
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function yearLength(ce) {
  let days = 6 * (30 + 29);
  if (isAdhikamasa(ce))      days += 30;
  else if (isAdhikavara(ce)) days += 1;
  return days;
}

function previousKattika(ce) {
  let date = new Date(KATTIKA_EPOCH);
  let y    = date.getFullYear();
  const target = ce - 1;
  const dir    = y < target ? 1 : -1;

  while (y !== target) {
    const stepCe  = dir === 1 ? y + 1 : y;
    date = addDays(date, yearLength(stepCe) * dir);
    y   += dir;
  }
  return date;
}

function nextUposatha(lu) {
  const nu = { ...lu };
  const ce = lu.date.getFullYear();
  const adhikamasa = isAdhikamasa(ce);
  const adhikavara = isAdhikavara(ce);

  nu.phase = lu.phase === "new" ? "full" : "new";

  if (nu.phase === "full") {
    nu.sNumber = lu.sNumber + 1;
    nu.uDays   = 15;
    if (adhikamasa) {
      nu.event = { 4:"magha", 7:"vesakha", 13:"asalha", 11:"pavarana" }[lu.lunarMonth] || "";
    } else {
      nu.event = { 3:"magha", 6:"vesakha",  8:"asalha", 11:"pavarana" }[lu.lunarMonth] || "";
    }
  } else {
    if      (lu.lunarMonth === 13) nu.lunarMonth = 9;
    else if (lu.lunarMonth === 8 && adhikamasa) nu.lunarMonth = 13;
    else if (lu.lunarMonth === 12) nu.lunarMonth = 1;
    else nu.lunarMonth = lu.lunarMonth + 1;

    nu.mDays = nu.lunarMonth % 2 === 1 ? 30 : 29;
    if (adhikavara && nu.lunarMonth === 8) nu.mDays = 30;
    nu.uDays = nu.mDays === 29 ? 14 : 15;

    const inGimhaExtra = adhikamasa && ((nu.lunarMonth >= 5 && nu.lunarMonth <= 8) || nu.lunarMonth === 13);
    nu.sTotal = inGimhaExtra ? 10 : 8;

    if (lu.sNumber < lu.sTotal) {
      nu.sNumber = lu.sNumber + 1;
    } else {
      nu.sNumber = 1;
      if (lu.lunarMonth === 12) {
        nu.lunarSeason = 1;
        nu.lunarYear = lu.lunarYear + 1;
      } else {
        nu.lunarSeason = lu.lunarSeason + 1;
      }
    }
    nu.event = "";
  }
  nu.date = addDays(lu.date, nu.uDays);
  return nu;
}

export function getUposathasForYear(ce) {
  const kattikaDate = previousKattika(ce);
  let lu = { date: kattikaDate, phase: "full", sNumber: 8, sTotal: 8, uDays: 15, mDays: 29, lunarMonth: 12, lunarSeason: 3, lunarYear: kattikaDate.getFullYear() + BE_DIFF };
  const results = [];
  while (lu.date.getFullYear() <= ce) {
    lu = nextUposatha(lu);
    if (lu.date.getFullYear() === ce) {
      results.push({ ...lu, monthName: MONTH_NAMES[lu.lunarMonth - 1] });
    }
  }
  return results;
}

function ordinalPali(n) {
  const paliOrdinals = {
    1:  "paṭhama",
    2:  "dutiya",
    3:  "tatiya",
    4:  "catuttha",
    5:  "pañcama",
    6:  "chaṭṭha",
    7:  "sattama",
    8:  "aṭṭhama",
    9:  "navama",
    10: "dasama",
    11: "ekādasama",
    12: "dvādasama",
    13: "terasama",
    14: "cuddasama",
    15: "pannarasama",
    16: "soḷasama",
    17: "sattarasama",
    18: "aṭṭhārasama",
    19: "ekūnavīsatima",
  };

  if (n >= 1 && n <= 19) return paliOrdinals[n];
  throw new RangeError(`Pāli ordinal not defined for n=${n} (supported: 1–19)`);
}

export function uposathaPositionInSeason(uposatha) {
  const ordinal = uposatha.sNumber;
  const phase   = (uposatha.uDays === 15 || uposatha.phase === "full")
    ? "paṇṇarasī"
    : "cātuddasī";
  const paliNumber  = ordinalPali(ordinal);
  return { ordinal, phase, label: `${paliNumber} <br/> ${phase}` };
}

export function uposathasRemainingInSeason(uposatha) {
  const total = uposatha.sTotal || 8; // Default to 8 if missing
  const remaining = total - uposatha.sNumber;
  return { remaining, label: isNaN(remaining) ? '-' : `${remaining}` };
}

export function uposathaSeason(uposatha) {
  const seasonNumber = uposatha.lunarSeason;
  const season       = SEASON_NAMES[seasonNumber] ?? "unknown";
  return { season, seasonNumber };
}

/**
 * Returns the dates of entering vassa and pavāraṇā for a given CE year.
 *
 * Pubba-vassa (first vassa):
 *   - Entry: day after the Āsāḷha full moon (asalha event)
 *   - Pavāraṇā: Kattika full moon (pavarana event)
 *
 * Pacchima-vassa (second/late vassa):
 *   - Entry: day after the first new moon following the Āsāḷha full moon
 *   - Pavāraṇā: the full moon one month after Kattika (Māgasira full moon)
 *
 * @param {number} ce  – CE year
 * @returns {{
 *   pubbaVassaEntry:    Date,
 *   pubbaVassaPavarana: Date,
 *   pacchimaVassaEntry:    Date,
 *   pacchimaVassaPavarana: Date,
 * }}
 */
export function getVassaDates(ce) {
  const uposathas = getUposathasForYear(ce);

  const asalhaFull    = uposathas.find(u => u.event === "asalha" && u.phase === "full");
  const pavaranaFull  = uposathas.find(u => u.event === "pavarana" && u.phase === "full");

  const pubbaVassaEntry    = asalhaFull    ? addDays(asalhaFull.date, 1)    : null;
  const pubbaVassaPavarana = pavaranaFull  ? pavaranaFull.date               : null;

  // Pacchima entry: day after the full moon that follows the first new moon
  // after the Āsāḷha full moon (i.e. one uposatha step later than before —
  // adds exactly one more fortnight)
  let pacchimaVassaEntry = null;
  if (asalhaFull) {
    const asalhaTime = asalhaFull.date.getTime();
    const nextNew = uposathas.find(u => u.phase === "new" && u.date.getTime() > asalhaTime);

    if (nextNew) {
      const nextNewTime = nextNew.date.getTime();
      let nextFull = uposathas.find(u => u.phase === "full" && u.date.getTime() > nextNewTime);

      // may spill into next CE year
      if (!nextFull) {
        const nextYearUposathas = getUposathasForYear(ce + 1);
        nextFull = nextYearUposathas.find(u => u.phase === "full" && u.date.getTime() > nextNewTime);
      }

      if (nextFull) pacchimaVassaEntry = addDays(nextFull.date, 1);
    }
  }

  // Pacchima pavāraṇā: full moon one month after Kattika full moon
  let pacchimaVassaPavarana = null;
  if (pavaranaFull) {
    const pavaranaTime = pavaranaFull.date.getTime();
    const nextFull = uposathas.find(u => u.phase === "full" && u.date.getTime() > pavaranaTime);
    if (nextFull) {
      pacchimaVassaPavarana = nextFull.date;
    } else {
      // may fall in next CE year
      const nextYear = getUposathasForYear(ce + 1);
      const nf = nextYear.find(u => u.phase === "full");
      if (nf) pacchimaVassaPavarana = nf.date;
    }
  }

  return { pubbaVassaEntry, pubbaVassaPavarana, pacchimaVassaEntry, pacchimaVassaPavarana };
}

/**
 * Returns Atikkanta (elapsed) and Avasiṭṭha (remaining) counts
 * for a given date within the Buddhist calendar.
 *
 * Definitions
 * ───────────
 * Atikkanta (elapsed):
 *   - years  : Buddhist Era years fully completed before the current year (bYear − 1)
 *   - months : lunar months elapsed since the start of the current BE year
 *              i.e. months from the last Vesak full moon up to, but not including,
 *              the lunar month in which `date` falls  (bMonth − 1)
 *   - days   : days elapsed since the most recent uposatha (new moon or full moon),
 *              counting from 0 on the uposatha day itself
 *
 * Avasiṭṭha (remaining):
 *   - years  : years remaining until BE 5000  (5000 − bYear)
 *   - months : lunar months remaining from the current month to the end of this BE year
 *              i.e. (totalMonthsInYear − bMonth)
 *   - days   : days remaining until the next full-moon uposatha (paṇṇarasī),
 *              counting 0 on the full-moon day itself
 *
 * @param {object} params
 * @param {number} params.bYear           – Buddhist Era year (e.g. 2569)
 * @param {number} params.bMonth          – current lunar month number within the BE year (1-based)
 * @param {number} params.totalMonths     – total lunar months in this BE year (12 or 13)
 * @param {number} params.daysSinceUposatha – days since the last new-moon or full-moon uposatha
 * @param {number} params.daysToFullMoon  – days until the next full-moon uposatha (paṇṇarasī)
 *
 * @returns {{
 *   atikkantaY: number,  // elapsed years
 *   atikkantaM: number,  // elapsed months
 *   atikkantaD: number,  // elapsed days
 *   avasitthaY: number,  // remaining years
 *   avasitthaM: number,  // remaining months
 *   avasitthaD: number   // remaining days (to full moon)
 * }}
 */
export function getAtikkantaAvasittha({ bYear, bMonth, totalMonths, daysSinceUposatha, daysToFullMoon }) {
  const atikkantaY = bYear - 1;
  const atikkantaM = Math.max(0, bMonth - 1);
  const atikkantaD = Math.max(0, daysSinceUposatha);

  const avasitthaY = 5000 - bYear;
  const avasitthaM = Math.max(0, totalMonths - bMonth);
  const avasitthaD = Math.max(0, daysToFullMoon);

  return { atikkantaY, atikkantaM, atikkantaD, avasitthaY, avasitthaM, avasitthaD };
}
