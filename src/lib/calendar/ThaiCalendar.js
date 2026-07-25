import { BuddhistCalendar } from "./BuddhistCalendar";
import { getUposathasForYear } from "./uposathalib";

const ANIMALS =["Sappa", "Assa", "Aja", "Kapi", "Kukkuṭa", "Sona", "Sūkara", "Musika", "Usabha", "Vyaggha", "Sasa", "Nāga"];
const SEASONS = { 1: "Hemanta", 2: "Gimhāna", 3: "Vassāna" };
const WEEK_DAYS =["Ravivāraṃ", "Candavāraṃ", "Bhummavāraṃ", "Budhavāraṃ", "Guruvāraṃ", "Sukkavāraṃ", "Soravāraṃ"];
const TITHI_PALI =["", "Paṭhamaṃ", "Dutiyaṃ", "Tatiyaṃ", "Catutthaṃ", "Pañcamaṃ", "Chaṭṭhamaṃ", "Sattamaṃ", "Aṭṭhamaṃ", "Navamaṃ", "Dasamaṃ", "Ekādasamaṃ", "Dvādasamaṃ", "Terasamaṃ", "Cuddasamaṃ", "Paṇṇarasamaṃ"];

export class ThaiCalendar extends BuddhistCalendar {
  constructor(config) {
    super(config);
  }

  getUposathasForYear(year) {
    return getUposathasForYear(year);
  }

  getDateDetails(date) {
    // Normalize to midnight so today's uposatha is never pushed into pastUpos
    const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const time = normalized.getTime();
    const y = date.getFullYear();
    const allUpos = [...this.getUposathasForYear(y - 1), ...this.getUposathasForYear(y), ...this.getUposathasForYear(y + 1)];

    const futureUpos = allUpos.filter((u) => u.date.getTime() >= time);
    const pastUpos = allUpos.filter((u) => u.date.getTime() < time);
    const lastUpo = pastUpos[pastUpos.length - 1];
    const nextUpo = futureUpos[0];

    const todayNormalized = time;
    const isUposathaDay = nextUpo && new Date(nextUpo.date.getFullYear(), nextUpo.date.getMonth(), nextUpo.date.getDate()).getTime() === todayNormalized;

    const daysSinceLast = Math.round((todayNormalized - lastUpo.date.getTime()) / 86400000);
    const tithi = isUposathaDay ? nextUpo.uDays : daysSinceLast; // not sure why do it added 1.
    
    let paksha = lastUpo.phase === "new" ? "Sukka pakkhe" : "Kanha pakkhe";
    if (isUposathaDay) paksha = nextUpo.phase === "full" ? "Sukka pakkhe" : "Kanha pakkhe";

    // Fix: derive bYear correctly (y+543 before Vesak, y+544 on/after) then use
    // bYear % 12 for the animal — not always (y+544) % 12
    const vesakDate = (() => {
      try { return this.getVesakDate(y); } catch { return new Date(y, 4, 15); }
    })();
    const vesakMidnight = new Date(vesakDate.getFullYear(), vesakDate.getMonth(), vesakDate.getDate());
    const bYear = (time < vesakMidnight.getTime()) ? (y + 543) : (y + 544);
    const animal = ANIMALS[bYear % 12];

    const season = SEASONS[nextUpo ? nextUpo.lunarSeason : 1];
    // Fix: use the monthName string already set by uposathalib instead of indexing
    // MONTH_NAMES with lunarMonth — the index shifts in adhikamasa (leap) years.
    // Additionally, override with standard event names for major uposathas.
    let mName = nextUpo?.monthName ?? "Vesākha";
    if (nextUpo?.event === "vesakha") mName = "Vesākha";
    if (nextUpo?.event === "magha") mName = "Māgha";
    if (nextUpo?.event === "asalha") mName = "Āsāḷha";
    
    const tithiWord = TITHI_PALI[Math.min(tithi, 15)] || TITHI_PALI[15];
    const weekDay = WEEK_DAYS[date.getDay()];

    return {
      animal, season, mName, tithiWord, weekDay, paksha, tithi,
      paliChant: `Ayaṃ\n${animal} saṃvacchare\n${season} utu asmiṃ utumhi\n${mName} māsassa\n${paksha}\n${tithiWord}\n${weekDay}\nidanti daṭṭhabbaṃ.`,
      sun: this.getSunTimes(date),
      isUposatha: isUposathaDay,
      moonPhase: isUposathaDay ? nextUpo.phase : null,
      nextUpo
    };
  }

  getEvents(year) {
    return this.getUposathasForYear(year).filter(u => u.event).map(u => ({
      date: u.date,
      event: { magha: "Makha Bucha", vesakha: "Visakha Bucha", asalha: "Asahna Bucha", pavarana: "Pavarana" }[u.event],
      country: "Thailand"
    }));
  }
}
