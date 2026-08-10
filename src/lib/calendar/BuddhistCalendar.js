import SunCalc from "suncalc";

export const ANIMALS = [
  "Sappa", "Assa", "Aja", "Kapi", "Kukkuṭa", "Sona",
  "Sūkara", "Musika", "Vasabha", "Vyaggha", "Sasa", "Nāga"
];
export const SEASONS = { 1: "Hemanta", 2: "Gimhāna", 3: "Vassāna" };
export const WEEK_DAYS = [
  "Ravivāraṃ", "Candavāraṃ", "Bhummavāraṃ", "Budhavāraṃ",
  "Guruvāraṃ", "Sukkavāraṃ", "Soravāraṃ"
];
export const TITHI_PALI = [
  "", "Paṭhamaṃ", "Dutiyaṃ", "Tatiyaṃ", "Catutthaṃ", "Pañcamaṃ",
  "Chaṭṭhamaṃ", "Sattamaṃ", "Aṭṭhamaṃ", "Navamaṃ", "Dasamaṃ",
  "Ekādasamaṃ", "Dvādasamaṃ", "Terasamaṃ", "Cuddasamaṃ", "Paṇṇarasamaṃ"
];

export class BuddhistCalendar {
  constructor(config = {}) {
    if (new.target === BuddhistCalendar) throw new TypeError("Abstract class cannot be instantiated directly.");
    this.lat = config.lat || 6.9271;
    this.lng = config.lng || 79.8612;
    this.dawnOffset = config.dawnOffset || 30;
    this._uposathasCache = {};
    this._vesakCache = {};

    // Dynamically wrap subclass methods to memoize expensive computations
    const originalGetUposathas = this.getUposathasForYear;
    this.getUposathasForYear = (year) => {
      if (year in this._uposathasCache) return this._uposathasCache[year];
      const res = originalGetUposathas.call(this, year);
      this._uposathasCache[year] = res;
      return res;
    };

    const originalGetVesak = this.getVesakDate;
    this.getVesakDate = (year) => {
      if (year in this._vesakCache) return this._vesakCache[year];
      const res = originalGetVesak.call(this, year);
      this._vesakCache[year] = res;
      return res;
    };
  }

  getSunTimes(date) {
    const times = SunCalc.getTimes(date, this.lat, this.lng);
    const sunrise = times.sunrise;
    const noon = times.solarNoon;
    const dawn = new Date(sunrise.getTime() - this.dawnOffset * 60000);
    return { dawn, sunrise, noon };
  }

  // Abstract methods
  getUposathasForYear(year) { throw new Error("Not implemented"); }
  getDateDetails(date) { throw new Error("Not implemented"); }
  getEvents(year) { throw new Error("Not implemented"); }

  /**
   * Returns the date of the Vesak full moon for a given CE year.
   * Prefers the uposatha explicitly marked event="vesakha" (correct in both
   * normal and adhikamasa/leap years). Falls back to the first full moon on
   * or after April 15 for calendar systems that don't set event names.
   * @param {number} year – CE year
   * @returns {Date}
   */
  getVesakDate(year) {
    const uposathas = this.getUposathasForYear(year);
    // Primary: use the explicitly labelled Vesak event (works correctly in
    // leap years where an extra month precedes Vesākha)
    const vesakEvent = uposathas.find(u => u.event === "vesakha" && (u.phase ?? u.type) === "full");
    if (vesakEvent) return vesakEvent.date;
    // Fallback: first full moon on or after April 15
    const threshold = new Date(year, 3, 15).getTime();
    const vesak = uposathas.find(u => (u.phase ?? u.type) === "full" && u.date.getTime() >= threshold);
    if (!vesak) throw new Error(`Vesak not found for year ${year}`);
    return vesak.date;
  }

  /**
   * Returns Atikkanta (elapsed) and Avasiṭṭha (remaining) counts
   * for the Buddhist Era year, month, and day relative to the given date.
   *
   * Matches the logic in index.html calculateAll():
   * - atikkantaY = bYear − 1
   * - atikkantaM = bM − 1   (lunar months elapsed since last Vesak full moon)
   * - atikkantaD = tithi − 1 (days elapsed since last full-moon uposatha)
   * - avasitthaY = 5000 − bYear
   * - avasitthaM = totM − bM (months remaining to next Vesak)
   * - avasitthaD = days from today to next full-moon uposatha (0 on full-moon day)
   *
   * Requires subclass to implement getUposathasForYear(year) returning an array of
   * { date: Date, phase: "full"|"new" } objects (type: "full"|"new" also accepted), and optionally getVesakDate(year).
   *
   * @param {Date} date – the civil date to query (time component ignored)
   * @returns {{
   *   bYear: number, bM: number, totM: number, tithi: number,
   *   atikkantaY: number, atikkantaM: number, atikkantaD: number,
   *   avasitthaY: number, avasitthaM: number, avasitthaD: number
   * }}
   */
  getAtikkantaAvasittha(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const time = d.getTime();
    const y = d.getFullYear();

    // Buddhist year changes on the day after Vesak.
    // Before that boundary: CE + 543
    // On/after that boundary: CE + 544
    const vesakDate = this.getVesakDate(y);
    const vesakThisYear = new Date(vesakDate.getFullYear(), vesakDate.getMonth(), vesakDate.getDate());
    const vesakNextDay = new Date(vesakThisYear);
    vesakNextDay.setDate(vesakNextDay.getDate() + 1);
    const bYear = (time < vesakNextDay.getTime()) ? (y + 543) : (y + 544);
    // Buddhist year changes on the day AFTER Vesak.
    // Example: Vesak Day        -> last day of old Buddhist year
    //          Day after Vesak  -> first day of new Buddhist year
    // Therefore vesakNextDay is used as the year boundary.
    // Vesak dates bracketing the current BE year
    const lastCEYear = (time < vesakNextDay.getTime()) ? y - 1 : y;
    const lastVD = this.getVesakDate(lastCEYear).getTime();
    const nextVD = this.getVesakDate(lastCEYear + 1).getTime();

    // Total lunar months in current BE year (12 or 13)
    const SYNODIC = 2551442400; // ms ≈ 29.53 days
    const totM = Math.round((nextVD - lastVD) / SYNODIC);

    // Gather all uposathas for the surrounding years to find past/future events
    const uposathasLastYear = this.getUposathasForYear(lastCEYear);
    const uposathasThisYear = this.getUposathasForYear(lastCEYear + 1);
    const allUposathas = [...uposathasLastYear, ...uposathasThisYear]
      .map(u => ({ ...u, time: u.date.getTime() }))
      .sort((a, b) => a.time - b.time);

    const fullMoons = allUposathas.filter(u => (u.phase ?? u.type) === "full");

    // Most recent full moon uposatha on or before the queried date.
    const pastFullMoons = fullMoons.filter(u => u.time <= time);
    const lastFullMoon = pastFullMoons.length > 0 ? pastFullMoons[pastFullMoons.length - 1] : null;

    // Determine whether today is a full moon day.
    // If the most recent full moon occurs on the same civil date
    // being queried, then today is a full moon day.
    const isFullMoonToday =
      lastFullMoon !== null &&
      lastFullMoon.time === time;

    // True when the date is the final day of the Buddhist year (Vesak full moon).
    // The following civil day starts Year + 1.
    // Normalize nextVD to midnight to avoid time-of-day issues.
    const nextVDDate = new Date(nextVD);
    nextVDDate.setHours(0, 0, 0, 0);

    const isClosingVesakDay =
      time === nextVDDate.getTime();

    // Lunar day count since the most recent full moon (0 on full-moon day).
    const tithi = lastFullMoon
      ? Math.round((time - lastFullMoon.time) / 86400000)
      : 0;

    // Full moon preceding the current lunar month.
    const previousFullMoon =
      pastFullMoons.length > 1
        ? pastFullMoons[pastFullMoons.length - 2]
        : null;
    let monthLength = null;
    let correctedTithi = tithi;

    if (isClosingVesakDay) {
      correctedTithi = 30;
    }
    else if (isFullMoonToday && previousFullMoon) {

      monthLength = Math.round(
        (lastFullMoon.time - previousFullMoon.time) / 86400000
      );

      correctedTithi = Math.min(30, Math.max(29, monthLength));
    }

    // Buddhist month number within the current Buddhist year (1-based).
    const fullMoonsInYear = fullMoons.filter(u => u.time >= lastVD && u.time < time);
    const bM = Math.min(totM, Math.max(1, fullMoonsInYear.length));
    // Do not apply modulo arithmetic here.
    // Leap years may contain Month 13, which must remain 13.

    // Days remaining until the next full moon.
    // Always 0 on a full-moon day or the closing Vesak day.
    const nextFullMoon = fullMoons.find(u => u.time > time);
    let avasitthaD = 0;

    if (nextFullMoon) {
      const nfd = new Date(nextFullMoon.date);
      nfd.setHours(0, 0, 0, 0);

      avasitthaD =
        Math.round((nfd.getTime() - time) / 86400000);
    }

    // On any month-ending full moon, no days remain in the month.
    if (isFullMoonToday) {
      avasitthaD = 0;
    }

    if (isClosingVesakDay) {
      avasitthaD = 0;
    }

    // Return elapsed (Atikkanta) and remaining (Avasiṭṭha) counts.
    return {
      bYear,
      bM,
      totM,

      // Current lunar day number
      tithi: correctedTithi,

      // Elapsed years, months, and days
      atikkantaY: bYear - 1,
      atikkantaM: bM,
      atikkantaD: correctedTithi - 1,
      avasitthaY: 5000 - bYear,
      avasitthaM: Math.max(0, totM - bM),
      avasitthaD,
    };

  }
}
