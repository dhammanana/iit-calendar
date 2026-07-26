import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  BookOpen,
  ChevronDown,
  Moon,
  Circle,
  Shuffle
} from 'lucide-react';
import {
  format,
  startOfMonth,
  isSameMonth,
  isSameDay,
  getDay,
  isToday,
  startOfDay,
  eachDayOfInterval,
  endOfMonth,
  subMonths,
  addMonths,
  subYears,
  addYears
} from 'date-fns';
import { Settings } from '../types';
import { useI18n } from '../hooks/useI18n';
import { SunDetails } from '../components/SunDetails';
import { SunTimesCalculator } from '../lib/calendar/SunTimesCalculator';
import { cn } from '../lib/utils';
import { convertPali, SCRIPTS } from '../services/conversionService';
import { Script } from '../lib/pali-script';
import { uposathaPositionInSeason, uposathasRemainingInSeason, uposathaSeason, getVassaDates, getUposathasForYear as getUposathasFromLib } from '../lib/calendar/uposathalib';
import { useData } from '../DataContext';
import { COLOR_TOKENS } from '../theme/index'
import { CardOrderModal, DEFAULT_CARD_ORDER } from '../components/CardOrderModal';
import { Edit2, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '../components/Button';
import { useUI } from '../UIContext';
import { PaliText } from '../components/PaliText';

const DAYS_OF_WEEK = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function convertPaliShort(scriptKey: string): string {
  return SCRIPTS[scriptKey] || Script.RO;
}

function HtmlWithPali({ html, script, className, style }: { html: string; script: string; className?: string; style?: React.CSSProperties }) {
  const [rendered, setRendered] = React.useState(html);
  React.useEffect(() => {
    let active = true;
    (async () => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');
      const paliDivs = doc.querySelectorAll('.pali');
      await Promise.all(
        Array.from(paliDivs).map(async (div) => {
          const textNodes: Text[] = [];
          div.childNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
              textNodes.push(node as Text);
            }
          });
          await Promise.all(
            textNodes.map(async (textNode) => {
              const original = textNode.textContent || '';
              const converted = await convertPali(original, script);
              const temp = doc.createElement('template');
              temp.innerHTML = converted;
              textNode.replaceWith(temp.content);
            })
          );
        })
      );
      if (active) {
        setRendered(doc.body.innerHTML);
      }
    })();
    return () => { active = false; };
  }, [html, script]);
  return (
    <div
      className={cn("PT", className)}
      style={style}
      script={convertPaliShort(script)}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}

export function CalendarScreen({
  settings,
  onUpdateSettings,
  currentDate,
  setCurrentDate,
  selectedDate,
  setSelectedDate,
  calendarEngine,
  sunCalc
}: {
  settings: Settings;
  onUpdateSettings: (settings: Settings) => void;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  calendarEngine: any;
  sunCalc: SunTimesCalculator;
}) {
  const { t, language } = useI18n();
  const { setShowSettings } = useUI();
  const { events: firebaseEvents, reflections: firebaseReflections } = useData();
  const [sunTimesExpanded, setSunTimesExpanded] = React.useState(false);
  const [paliExpanded, setPaliExpanded] = React.useState(false);
  const [isEventsExpanded, setIsEventsExpanded] = React.useState(false);
  const [reflectionOffset, setReflectionOffset] = React.useState(0);
  const [activeIITTab, setActiveIITTab] = React.useState<'si' | 'en'>(language === 'si' ? 'si' : 'en');
  const [showOrderModal, setShowOrderModal] = React.useState(false);

  React.useEffect(() => {
    setActiveIITTab(language === 'si' ? 'si' : 'en');
  }, [language]);

  const filteredEvents = React.useMemo(() => {
    return firebaseEvents.filter(evt => {
      if (!evt.language) return true;
      if (settings.isIITStudent !== false) return true;
      return false;
    });
  }, [firebaseEvents, settings.isIITStudent]);

  const monthDays = React.useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const dateDetails = React.useMemo(() => calendarEngine.getDateDetails(selectedDate), [selectedDate, calendarEngine]);
  const activeDawn = React.useMemo(() => sunCalc.getDawn(selectedDate, settings), [sunCalc, selectedDate, settings]);
  const uposathas = React.useMemo(() => {
    return calendarEngine.getUposathasForYear(currentDate.getFullYear());
  }, [currentDate, calendarEngine]);

  const nextUposatha = React.useMemo(() => {
    const refDate = startOfDay(selectedDate);
    return uposathas.find((u: any) => startOfDay(u.date) >= refDate);
  }, [uposathas, selectedDate]);

  const uposathaInfo = React.useMemo(() => {
    if (!nextUposatha) return null;
    return {
      pos: uposathaPositionInSeason(nextUposatha),
      rem: uposathasRemainingInSeason(nextUposatha),
      seas: uposathaSeason(nextUposatha)
    };
  }, [nextUposatha]);

  const isUposathaToday = nextUposatha && isSameDay(nextUposatha.date, selectedDate);

  const vassaDates = React.useMemo(() => getVassaDates(currentDate.getFullYear()), [currentDate]);

  // ── Atikkanta / Avasiṭṭha ─────────────────────────────────────────────
  const elapsed = React.useMemo(
    () => calendarEngine.getAtikkantaAvasittha(selectedDate),
    [selectedDate, calendarEngine]
  );

  // ── Events Logic ────────────────────────────────────────────────────────
  const todaysEvents = React.useMemo(() => {
    const groups: Record<string, any[]> = {};
    const day = selectedDate.getDate();
    const month = selectedDate.getMonth() + 1;
    const year = selectedDate.getFullYear();
    const dayOfWeek = format(selectedDate, 'EEEE');

    const checkEvent = (e: any) => {
      if (e.calendar_type === 'day_month_year') {
        return Number(e.day) === day && Number(e.month) === month && Number(e.year) === year;
      }
      if (e.calendar_type === 'day_month') {
        return Number(e.day) === day && Number(e.month) === month;
      }
      if (e.calendar_type === 'day') {
        return Number(e.day) === day;
      }
      if (e.calendar_type === 'day_of_week') {
        return e.day_of_week === dayOfWeek;
      }
      return false;
    };

    filteredEvents.forEach(evt => {
      if (checkEvent(evt)) {
        const groupName = evt.category;
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push(evt);
      }
    });

    return groups;
  }, [selectedDate, settings.calendarType, firebaseEvents]);

  // ── Reflections Logic ───────────────────────────────────────────────────
  const reflection = React.useMemo(() => {
    if (!firebaseReflections.length) return { quote: '', author: '', source: '' };
    const seed = selectedDate.getFullYear() * 10000 + (selectedDate.getMonth() + 1) * 100 + selectedDate.getDate();
    const baseIndex = seed % firebaseReflections.length;
    const index = (baseIndex + reflectionOffset) % firebaseReflections.length;
    const finalIndex = index < 0 ? index + firebaseReflections.length : index;
    return firebaseReflections[finalIndex];
  }, [selectedDate, firebaseReflections, reflectionOffset]);

  React.useEffect(() => {
    setReflectionOffset(0);
  }, [selectedDate]);

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevYear = () => setCurrentDate(subYears(currentDate, 1));
  const nextYear = () => setCurrentDate(addYears(currentDate, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  return (
    <div className="flex flex-col relative bg-[var(--bg-main)]">

      {/* Dynamic/Notch-compatible Vector Illustration Header */}
      <div
        className="w-full safe-header-calendar bg-gradient-to-b from-[#f8f2e4] via-[#ede0c0] to-[#ddc898] dark:from-[#0d0905] dark:via-[#1a1005] dark:to-[#0d0905] sticky top-0 z-10 flex items-center justify-center"
      >
        {/* Center alignment wrapper for orbits & logo, shifted up to prevent clipping on mobile */}
        <div className="relative w-[260px] h-[260px] flex items-center justify-center -translate-y-3">
          {/* Styled CSS/SVG — Sun & Moon orbit Mount Sumeru (Theravāda cosmology) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none select-none" viewBox="0 0 100 100">
            <style dangerouslySetInnerHTML={{
              __html: `
              /* Shadow slides: -r = full moon, 0 = half, +r = new moon, 0 = half, repeat */
              @keyframes shadow-slide {
                0%   { transform: translateX(-4.5px); }
                25%  { transform: translateX(0px); }
                50%  { transform: translateX(4.5px); }
                75%  { transform: translateX(0px); }
                100% { transform: translateX(-4.5px); }
              }
            ` }} />

            <defs>
              {/* Moon phase mask */}
              <mask id="moon-phase-mask">
                <circle cx="50" cy="10" r="4.5" fill="white" />
                <circle cx="50" cy="10" r="4.5" fill="black"
                  style={{
                    animation: 'shadow-slide 48s linear infinite',
                    transformOrigin: '50px 10px'
                  }} />
              </mask>

              {/* Vignette removed — no SVG rect needed */}

              {/* Sun radial glow — anchored to sun position (50, 90) */}
              <radialGradient id="sun-glow" cx="50" cy="90" r="8"
                gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#f0c060" stopOpacity="0.7" />
                <stop offset="60%" stopColor="#d08820" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#b06010" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* ── Chanting beads — full circle (Mālā) slowly rotating ────── */}
            <g className="animate-[spin_180s_linear_infinite]" style={{ transformOrigin: '50% 50%' }}>
              <circle cx="50" cy="50" r="40"
                stroke="#7a5c3a" strokeWidth="2"
                strokeDasharray="0.1 3.5" strokeLinecap="round"
                fill="none" opacity="0.18" />
            </g>

            {/* ── Sumeru orbit ring ───────────────────────────────────────── */}
            <circle cx="50" cy="50" r="40"
              stroke="#7a5c3a" strokeWidth="0.4"
              fill="none" opacity="0.12" />

            {/* ── Sun & Moon orbit Sumeru clockwise together ────────────────
                 Both are in the same rotating group so they remain 180° apart.
                 Moon is at (50, 10) — top.  Sun is at (50, 90) — bottom.       */}
            <g className="animate-[spin_48s_linear_infinite]" style={{ transformOrigin: '50% 50%' }}>

              {/* ── SUN ─────────────────────────────────────────────────── */}
              {/* Soft warm glow */}
              <circle cx="50" cy="90" r="8" fill="url(#sun-glow)" />
              {/* Sun disc */}
              <circle cx="50" cy="90" r="3.2"
                fill="#d4922a" opacity="0.65" />
              {/* Bright core */}
              <circle cx="50" cy="90" r="1.6"
                fill="#f5d070" opacity="0.80" />

              {/* ── MOON ─────────────────────────────────────────────────── */}
              <g className="animate-[spin_48s_linear_infinite_reverse]"
                style={{ transformOrigin: '50px 10px' }}>
                {/* Shadowed (dark) side — deep blue-grey like night sky */}
                <circle cx="50" cy="10" r="4.5"
                  fill="#2a3040" opacity="0.55" />
                {/* Lit side — pearlescent silver-white */}
                <circle cx="50" cy="10" r="4.5"
                  fill="#e8e4d8" opacity="0.95"
                  mask="url(#moon-phase-mask)" />
                {/* Crisp outline */}
                <circle cx="50" cy="10" r="4.5"
                  stroke="#c8c0b0" strokeWidth="0.5"
                  fill="none" opacity="0.6" />
              </g>

            </g>
          </svg>

          {/* IIT Logo centered on top of the orbits */}
          <img
            src="/logo.png"
            alt="IIT Logo"
            className="relative z-10 w-28 h-28 object-contain drop-shadow-lg select-none pointer-events-none"
          />
        </div>

      </div>

      {/* Card Overlay container (Oval at the top overlapping the header) */}
      <div className="relative z-20 mt-[-2.5rem] bg-[var(--bg-main)] rounded-t-[3rem] px-4 pt-6 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.25)] flex flex-col gap-6">

        {/* Title & Tagline info inside the card */}
        <div className="px-2 text-center flex flex-col items-center relative w-full pr-12 pl-12">
          <h1 className="font-serif text-3xl font-bold text-[var(--text-primary)] leading-none mb-1.5">
            IIT Calendar
          </h1>
          <Button
            onClick={() => setShowSettings(true)}
            variant="outline"
            icon={SettingsIcon}
            aria-label="Settings"
            className="absolute top-1/2 -translate-y-1/2 right-2 shadow-sm"
          />
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-none flex-wrap">
            <span>{settings.calendarType === 'srilanka' ? t('calendar.srilanka') : settings.calendarType}</span>
            <span>·</span>
            <span>{t('calendar.mode')}</span>
            {settings.address && (
              <>
                <span>·</span>
                <span className="normal-case font-medium text-slate-400 dark:text-slate-500 truncate max-w-[200px]">{settings.address}</span>
              </>
            )}
          </div>
        </div>

        {/* ── Calendar Grid Section ─────────────────────────────────────────── */}
        <section
          className="card-lg relative overflow-hidden"
          style={{
            background: 'color-mix(in srgb, var(--surface) 100%, transparent)',
            borderColor: 'var(--border)',
          }}
        >
          <header className="flex flex-col gap-4 mt-4 mb-8 px-2 relative z-10">
            <div className="flex justify-between items-center w-full">
              <h2
                className="font-serif text-3xl sm:text-4xl font-bold leading-none flex items-baseline gap-3"
                style={{ color: 'var(--accent)' }}
              >
                {format(currentDate, 'MMMM')}
                <span
                  className="italic text-xl sm:text-2xl"
                  style={{ color: 'var(--accent)' }}
                >
                  {format(currentDate, 'yyyy')}
                </span>
              </h2>
              <Button
                onClick={goToToday}
                variant="outline"
                size="sm"
                className="h-9"
              >
                {t('common.today')}
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div
                className="flex items-center p-1 rounded-2xl shadow-sm"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <NavBtn onClick={prevYear} small title="Previous Year"><ChevronLeft size="1.2em" className="stroke-[3px]" /></NavBtn>
                <span className="px-1 text-xs font-bold tracking-wider" style={{ color: 'var(--accent)' }}>
                  {format(currentDate, 'yyyy')}
                </span>
                <NavBtn onClick={nextYear} small title="Next Year"><ChevronRight size="1.2em" className="stroke-[3px]" /></NavBtn>
              </div>

              <div
                className="flex items-center p-1 rounded-2xl shadow-sm"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <NavBtn onClick={prevMonth} small title="Previous Month"><ChevronLeft size="1.2em" className="stroke-[3px]" /></NavBtn>
                <span className="px-1 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                  {format(currentDate, 'MMM')}
                </span>
                <NavBtn onClick={nextMonth} small title="Next Month"><ChevronRight size="1.2em" className="stroke-[3px]" /></NavBtn>
              </div>
            </div>
          </header>

          <div className="relative z-10 px-1">
            <div className="grid grid-cols-7 mb-6">
              {DAYS_OF_WEEK.map(day => (
                <span
                  key={`header-${day}`}
                  className="text-sm font-black text-center tracking-widest"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {t(`calendar.days.${day.toLowerCase()}`)}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-3">
              {Array.from({ length: getDay(startOfMonth(currentDate)) }).map((_, i) => (
                <div key={`month-pad-${i}`} className="h-12 w-full" />
              ))}

              {monthDays.map((date) => {
                const dateInfo = calendarEngine.getDateDetails(date);
                const isSelected = isSameDay(date, selectedDate);
                const isTodayDate = isToday(date);
                const isCurrentMonth = isSameMonth(date, currentDate);

                const dateDay = date.getDate();
                const dateMonth = date.getMonth() + 1;
                const dateYear = date.getFullYear();
                const dateDayOfWeek = format(date, 'EEEE');

                const check = (e: any) => {
                  if (e.calendar_type === 'day_month_year') {
                    return Number(e.day) === dateDay && Number(e.month) === dateMonth && Number(e.year) === dateYear;
                  }
                  if (e.calendar_type === 'day_month') {
                    return Number(e.day) === dateDay && Number(e.month) === dateMonth;
                  }
                  if (e.calendar_type === 'day') {
                    return Number(e.day) === dateDay;
                  }
                  if (e.calendar_type === 'day_of_week') {
                    return e.day_of_week === dateDayOfWeek;
                  }
                  return false;
                };

                const hasEvents = filteredEvents.some(check);

                let dateColor: string;
                if (isSelected) dateColor = 'rgb(255 255 255)';
                else if (isTodayDate) dateColor = 'var(--accent)';
                else if (!isCurrentMonth) dateColor = 'var(--text-disabled)';
                else dateColor = 'var(--accent)';

                return (
                  <div key={`cell-${date.toISOString()}`} className="flex justify-center relative">
                    <button
                      onClick={() => setSelectedDate(date)}
                      className="h-12 w-12 rounded-2xl flex flex-col items-center justify-center transition-all relative group"
                      style={isSelected
                        ? { background: 'var(--accent)', boxShadow: `0 8px 24px var(--accent-shadow)`, transform: 'scale(1.1)' }
                        : { background: 'transparent' }
                      }
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-hover)'; }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                    >
                      <span
                        className="relative text-base font-semibold z-10"
                        style={{ color: dateColor, fontWeight: isSelected ? 700 : 600 }}
                      >
                        {format(date, 'd')}
                      </span>

                      {dateInfo.isUposatha && (
                        <div
                          className="absolute -top-1 -right-1 z-20 transition-transform"
                          style={{ color: isSelected ? 'rgb(255 255 255)' : 'var(--lotus)' }}
                        >
                          {dateInfo.moonPhase === 'full' ? (
                            <Circle size={10} fill="currentColor" />
                          ) : dateInfo.moonPhase === 'new' ? (
                            <Moon size={10} fill="currentColor" />
                          ) : (
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ background: 'var(--lotus-muted)' }}
                            />
                          )}
                        </div>
                      )}

                      {isTodayDate && (
                        <div
                          className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                          style={{ background: 'var(--today-dot)' }}
                        />
                      )}

                      {hasEvents && !isTodayDate && (
                        <div
                          className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full opacity-40"
                          style={{ background: isSelected ? 'white' : 'var(--accent)' }}
                        />
                      )}

                      {isSelected && (
                        <motion.div
                          layoutId="sel"
                          className="absolute inset-0 rounded-2xl -z-0"
                          style={{ background: 'var(--accent)', boxShadow: `0 8px 20px var(--accent-shadow)` }}
                        />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Animated Details ─────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${settings.calendarType}-${selectedDate.toISOString()}`}
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6"
          >
            {(settings.calendarCardOrder || DEFAULT_CARD_ORDER).map((cardId) => {
              switch (cardId) {
                case 'uposatha':
                  return nextUposatha && (
                    <div
                      key="card-uposatha"
                      className="card relative overflow-hidden"
                      style={{
                        background: 'var(--bg-card)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <CalendarIcon size={13} style={{ color: 'var(--accent)', opacity: 0.7 }} />
                        <span className="label-eyebrow">
                          {t('calendar.upcomingUposatha')}
                        </span>
                      </div>

                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex flex-col gap-1.5">
                            <p className="text-2xl font-bold leading-tight" style={{ color: 'var(--accent)' }}>
                              {format(nextUposatha.date, 'MMMM d')}
                            </p>
                            <div className="flex items-center gap-1.5">
                              <span style={{ color: 'var(--accent)', opacity: 0.65 }}>
                                {nextUposatha.phase === 'full' ? <Circle size={11} fill="currentColor" /> : <Moon size={11} fill="currentColor" />}
                              </span>
                              <PaliText
                                text={nextUposatha.uDays === 14 ? 'Cātuddasī' : 'Paṇṇarasī'}
                                script={settings.paliScript}
                                className="text-[10px] font-black uppercase tracking-widest"
                                style={{ color: 'var(--text-muted)' } as React.CSSProperties}
                              />
                            </div>
                          </div>

                          <div className="text-right">
                            {isUposathaToday ? (
                              <div
                                className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest"
                                style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                              >
                                Today
                              </div>
                            ) : (
                              <div className="flex flex-col items-end">
                                <p
                                  className="text-xs font-black uppercase tracking-[0.2em] mb-0.5 whitespace-nowrap"
                                  style={{ color: 'var(--text-muted)' }}
                                >
                                  {t('calendar.startsIn')}
                                </p>
                                <p
                                  className="text-2xl font-black leading-none"
                                  style={{ color: 'var(--accent)' }}
                                >
                                  {Math.max(0, Math.round((nextUposatha.date.getTime() - selectedDate.setHours(0, 0, 0, 0)) / 86400000))}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-3 flex justify-between w-full items-center text-center"
                          style={{ borderTop: '1px solid var(--border)' }}>
                          <MetaCell label={t('calendar.season')}>
                            <PaliText
                              text={uposathaInfo?.seas.season || ''}
                              script={settings.paliScript}
                              className="capitalize"
                            />
                          </MetaCell>
                          <MetaCell label={t('calendar.occasion')}>
                            <PaliText
                              text={uposathaInfo?.pos.label || ''}
                              script={settings.paliScript}
                            />
                          </MetaCell>
                          <MetaCell label={t('calendar.pakkha')} right>
                            <PaliText
                              text={nextUposatha.phase === 'full' ? 'Sukka' : 'Kaṇha'}
                              script={settings.paliScript}
                            />
                          </MetaCell>
                        </div>
                      </div>

                      <div
                        className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-3xl -z-0"
                        style={{ background: 'var(--accent-muted)' }}
                      />
                    </div>
                  );
                case 'sun':
                  return (
                    <SunDetails
                      key="card-sun"
                      expanded={sunTimesExpanded}
                      setExpanded={setSunTimesExpanded}
                      settings={settings}
                      onUpdateSettings={onUpdateSettings}
                      date={selectedDate}
                      calculator={sunCalc}
                      activeDawn={activeDawn}
                    />
                  );
                case 'pali_vassa':
                  return (
                    <section
                      key="card-pali-vassa"
                      className="card space-y-6"
                      style={{
                        background: 'var(--bg-card)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <CalendarIcon size={13} style={{ color: 'var(--accent)', opacity: 0.7 }} />
                        <span className="label-eyebrow">
                          {t('calendar.buddhistCalendar') || 'Buddhist Calendar'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                        <DetailRow label={t('calendar.month')} value={dateDetails.mName} script={settings.paliScript} />
                        <DetailRow label={t('calendar.year')} value={dateDetails.animal} script={settings.paliScript} />
                        <DetailRow label={t('calendar.season')} value={dateDetails.season} script={settings.paliScript} />
                        <DetailRow label={t('calendar.weekDay')} value={dateDetails.weekDay} script={settings.paliScript} />
                      </div>

                      <div className="pt-6" style={{ borderTop: '1px solid var(--border)' }}>
                        <h4 className="label-eyebrow mb-4 text-center">
                          {t('calendar.vassaAndPavarana')}
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <VassaItem
                            label={t('calendar.pubbaVassa')}
                            entry={vassaDates.pubbaVassaEntry}
                            pavarana={vassaDates.pubbaVassaPavarana}
                            t={t}
                          />
                          <VassaItem
                            label={t('calendar.pacchimaVassa')}
                            entry={vassaDates.pacchimaVassaEntry}
                            pavarana={vassaDates.pacchimaVassaPavarana}
                            t={t}
                          />
                        </div>
                      </div>
                    </section>
                  );
                case 'atikkanta':
                  return (
                    <section
                      key="card-atikkanta"
                      className="card overflow-hidden !p-0 shadow-sm"
                      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                    >
                      {/* Standard header inside padded card */}
                      <div className="card-header">
                        <Moon size={13} style={{ color: 'var(--accent)', opacity: 0.7 }} />
                        <span className="label-eyebrow">
                          {t('calendar.buddhistEraProgress')}
                        </span>
                      </div>

                      {/* Three-column grid — Atikkanta | current values | Avasiṭṭha */}
                      <div
                        className="grid grid-cols-3 divide-x"
                        style={{ divideColor: 'var(--border)' } as React.CSSProperties}
                      >
                        {/* ── Atikkanta (Elapsed) ── */}
                        <div
                          className="flex flex-col items-center gap-3 p-4"
                          style={{ background: 'var(--accent-subtle)' }}
                        >
                          <span className="label-eyebrow text-[9px] text-center leading-tight">
                            {t('calendar.atikkanta')}{'\n'}({t('calendar.elapsed')})
                          </span>
                          <EraCounter value={elapsed.atikkantaY} unit="Y" dimmed />
                          <EraCounter value={elapsed.atikkantaM} unit="M" dimmed />
                          <EraCounter value={elapsed.atikkantaD} unit="D" dimmed />
                        </div>

                        {/* ── Current BE values (centre column) ── */}
                        <div
                          className="flex flex-col items-center gap-3 p-4"
                          style={{ background: 'var(--surface)' }}
                        >
                          <span className="label-eyebrow-accent text-[9px] text-center leading-tight">
                            {t('calendar.buddhistEra')}
                          </span>
                          <EraCounter value={elapsed.bYear} unit="Y" accent />
                          <EraCounter value={elapsed.bM} unit="M" accent />
                          <EraCounter value={elapsed.tithi} unit="D" accent />
                        </div>

                        {/* ── Avasiṭṭha (Remaining) ── */}
                        <div
                          className="flex flex-col items-center gap-3 p-4"
                          style={{ background: 'var(--accent-subtle)' }}
                        >
                          <span className="label-eyebrow text-[9px] text-center leading-tight">
                            {t('calendar.avasittha')}{'\n'}({t('calendar.remaining')})
                          </span>
                          <EraCounter value={elapsed.avasitthaY} unit="Y" />
                          <EraCounter value={elapsed.avasitthaM} unit="M" />
                          <EraCounter value={elapsed.avasitthaD} unit="D" />
                        </div>
                      </div>

                      {/* Progress bar — fraction of BE 5000 elapsed */}
                      <div
                        className="px-5 pb-4 pt-3 flex flex-col gap-1.5"
                        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}
                      >
                        <div className="flex justify-between items-center">
                          <span className="label-eyebrow text-[9px]">BE 1</span>
                          <span className="text-[9px] font-black" style={{ color: 'var(--accent)' }}>
                            {(elapsed.bYear / 5000 * 100).toFixed(2)}%
                          </span>
                          <span className="label-eyebrow text-[9px]">BE 5000</span>
                        </div>
                        <div
                          className="w-full h-2 rounded-full overflow-hidden"
                          style={{ background: 'var(--accent-subtle)' }}
                        >
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: 'var(--accent)' }}
                            initial={{ width: 0 }}
                            animate={{ width: `${elapsed.bYear / 5000 * 100}%` }}
                            transition={{ duration: 1.2, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    </section>
                  );
                case 'recitation':
                  return (
                    <div
                      key="card-recitation"
                      className="card space-y-4 relative overflow-hidden"
                      style={{
                        background: 'var(--bg-card)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      <button onClick={() => setPaliExpanded(!paliExpanded)} className="w-full flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen size={13} style={{ color: 'var(--accent)', opacity: 0.7 }} />
                          <span className="label-eyebrow">
                            {t('calendar.paliRecitation')}
                          </span>
                        </div>
                        <div
                          className={cn("p-1.5 rounded-full transition-transform duration-300", paliExpanded && "rotate-180")}
                          style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                        >
                          <ChevronDown size={14} />
                        </div>
                      </button>

                      <AnimatePresence>
                        {paliExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <pre
                              className="font-serif text-xl leading-[1.8] whitespace-pre-wrap italic text-center"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              <PaliText
                                text={dateDetails.paliChant}
                                script={settings.paliScript}
                                style={{ whiteSpace: 'pre-wrap' } as React.CSSProperties}
                              />
                            </pre>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                case 'events':
                  return Object.keys(todaysEvents).length > 0 && (
                    <div
                      key="card-events"
                      className="card space-y-4"
                      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                    >
                      <button
                        onClick={() => setIsEventsExpanded(!isEventsExpanded)}
                        className="w-full flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <CalendarIcon size={13} style={{ color: 'var(--accent)', opacity: 0.7 }} />
                          <span className="label-eyebrow">
                            {t('calendar.scheduleAndEvents')}
                          </span>
                        </div>
                        <div
                          className={cn("p-1.5 rounded-full transition-transform duration-300", isEventsExpanded && "rotate-180")}
                          style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                        >
                          <ChevronDown size={14} />
                        </div>
                      </button>

                      <AnimatePresence>
                        {isEventsExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden space-y-6 pt-2"
                          >
                            {Object.entries(todaysEvents).map(([groupName, events]) => {
                              const sortedEvents = [...(events as any[])].sort((a, b) => {
                                if (!a.time) return 1;
                                if (!b.time) return -1;
                                const toMinutes = (time: string) => {
                                  const [h, m] = time.split(':').map(Number);
                                  return h * 60 + m;
                                };
                                return toMinutes(a.time) - toMinutes(b.time);
                              });

                              const hasLanguageEvents = events.some(e => e.language);
                              const displayEvents = hasLanguageEvents
                                ? sortedEvents.filter(e => e.language === activeIITTab)
                                : sortedEvents;

                              return (
                                <div key={`event-group-${groupName}`} className="space-y-3">
                                  <div className="flex justify-between items-center w-full">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-1.5 h-1.5 rounded-full"
                                        style={{ background: 'var(--accent)' }}
                                      />
                                      <span className="label-section leading-none opacity-60">
                                        {groupName}
                                      </span>
                                    </div>

                                    {hasLanguageEvents && (
                                      <div className="flex bg-[color-mix(in_srgb,var(--accent-subtle)_80%,transparent)] p-0.5 rounded-xl border border-white/20">
                                        <button
                                          onClick={() => setActiveIITTab('si')}
                                          className={cn(
                                            "px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all",
                                            activeIITTab === 'si'
                                              ? "shadow-sm bg-[var(--accent)] text-white"
                                              : "opacity-60 text-[var(--text-primary)] hover:opacity-100"
                                          )}
                                        >
                                          {t('settings.languages.si') || 'Sinhala'}
                                        </button>
                                        <button
                                          onClick={() => setActiveIITTab('en')}
                                          className={cn(
                                            "px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all",
                                            activeIITTab === 'en'
                                              ? "shadow-sm bg-[var(--accent)] text-white"
                                              : "opacity-60 text-[var(--text-primary)] hover:opacity-100"
                                          )}
                                        >
                                          {t('settings.languages.en') || 'English'}
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  <div className="space-y-2">
                                    {displayEvents.length === 0 ? (
                                      <div className="text-xs italic opacity-55 py-2 pl-3" style={{ color: 'var(--text-muted)' }}>
                                        No scheduled items
                                      </div>
                                    ) : (
                                      displayEvents.map((evt, idx) => (
                                        <div
                                          key={`event-item-${groupName}-${evt.id || idx}`}
                                          className="flex justify-between items-center p-3 rounded-2xl"
                                          style={{
                                            background: 'var(--accent-subtle)',
                                            border: '1px solid var(--border)',
                                          }}
                                        >
                                          <div className="flex flex-col gap-1">
                                            <span
                                              className="text-sm font-bold"
                                              style={{ color: 'var(--accent)' }}
                                            >
                                              {evt.event_name || evt.subject || evt.category}
                                            </span>
                                          </div>

                                          {evt.time && (
                                            <span
                                              className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg shadow-sm"
                                              style={{ background: 'var(--bg-card)', color: 'var(--accent)', border: '1px solid var(--border)' }}
                                            >
                                              {evt.time}
                                            </span>
                                          )}
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                case 'reflection':
                  return (
                    <div
                      key="card-reflection"
                      className="card space-y-6 relative overflow-hidden text-center"
                      style={{
                        background: 'var(--bg-card)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      <div className="flex justify-center mb-2">
                        <BookOpen size={24} style={{ color: 'var(--accent)' }} />
                      </div>
                      <HtmlWithPali
                        html={reflection.quote}
                        script={settings.paliScript}
                        className="font-serif text-xl italic leading-relaxed text-center"
                        style={{ color: 'var(--accent)' }}
                      />
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                          {reflection.author === "Buddha" ? "The Buddha" : reflection.author}
                        </span>
                        <span className="label-section opacity-40">
                          {reflection.source}
                        </span>
                      </div>

                      <div className="flex justify-center items-center gap-3 pt-2 relative z-10">
                        <Button
                          onClick={() => setReflectionOffset(prev => prev - 1)}
                          variant="outline"
                          icon={ChevronLeft}
                          aria-label="Previous reflection"
                        />

                        <Button
                          onClick={() => {
                            const rand = Math.floor(Math.random() * firebaseReflections.length);
                            setReflectionOffset(rand);
                          }}
                          variant="outline"
                          size="sm"
                          icon={Shuffle}
                          className="h-9"
                        >
                          {t('calendar.random')}
                        </Button>

                        <Button
                          onClick={() => setReflectionOffset(prev => prev + 1)}
                          variant="outline"
                          icon={ChevronRight}
                          aria-label="Next reflection"
                        />
                      </div>

                      <div
                        className="absolute -top-10 -left-10 w-32 h-32 rounded-full blur-3xl"
                        style={{ background: 'var(--accent-muted)' }}
                      />
                    </div>
                  );
                default:
                  return null;
              }
            })}

            {/* Edit Button */}
            <div className="flex justify-center mt-4">
              <Button
                onClick={() => setShowOrderModal(true)}
                variant="outline"
                size="lg"
                icon={Edit2}
              >
                {t('common.edit')}
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>

        <CardOrderModal
          show={showOrderModal}
          onClose={() => setShowOrderModal(false)}
          cardOrder={settings.calendarCardOrder || []}
          onUpdate={(newOrder) => onUpdateSettings({ ...settings, calendarCardOrder: newOrder })}
        />
      </div>
    </div>
  );
}

// ── Small helpers ────────────────────────────────────────────────────────────

function NavBtn({
  onClick, children, title, small
}: {
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "rounded-xl transition-all active:scale-90",
        small ? "p-2" : "p-2"
      )}
      style={{ color: 'var(--accent)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-hover)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

function MetaCell({
  label, children, right
}: {
  label: string;
  children: React.ReactNode;
  right?: boolean;
}) {
  return (
    <div className={cn("flex flex-col", right && "text-right")}>
      <span
        className="text-sm font-black uppercase tracking-tighter"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </span>
      <span
        className="text-sm font-bold italic"
        style={{ color: 'var(--accent)' }}
      >
        {children}
      </span>
    </div>
  );
}

function DetailRow({ label, value, script }: { label: string; value: string; script: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <PaliText text={value} script={script} className="text-base font-bold" style={{ color: 'var(--accent)' } as React.CSSProperties} />
    </div>
  );
}

function VassaItem({ label, entry, pavarana, t }: { label: string; entry: Date | null; pavarana: Date | null; t: any }) {
  if (!entry || !pavarana) return null;
  return (
    <div
      className="flex flex-col gap-2 p-3 rounded-2xl"
      style={{ background: 'var(--accent-subtle)', border: '1px solid var(--border)' }}
    >
      <span className="text-[11px] font-black uppercase tracking-tighter" style={{ color: 'var(--accent)' }}>{label}</span>
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('calendar.entry')}</span>
          <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{format(entry, 'MMM d')}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('calendar.pavarana')}</span>
          <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{format(pavarana, 'MMM d')}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * A single number+unit pill used in the Atikkanta/Avasiṭṭha card.
 * accent  — uses --accent colour (centre column)
 * dimmed  — uses --text-muted   (elapsed / atikkanta column)
 * default — uses --accent with reduced opacity (remaining / avasiṭṭha column)
 */
function EraCounter({
  value, unit, accent, dimmed
}: {
  value: number;
  unit: 'Y' | 'M' | 'D';
  accent?: boolean;
  dimmed?: boolean;
}) {
  const unitLabels: Record<string, string> = { Y: 'yrs', M: 'mo', D: 'days' };
  return (
    <div className="flex flex-col items-center gap-0.5 w-full">
      <span
        className="text-2xl font-black leading-none tabular-nums"
        style={{
          color: accent
            ? 'var(--accent)'
            : dimmed
              ? 'var(--text-muted)'
              : 'var(--accent)',
          opacity: dimmed ? 0.6 : accent ? 1 : 0.75,
        }}
      >
        {value.toLocaleString()}
      </span>
      <span
        className="text-[9px] font-black uppercase tracking-widest"
        style={{ color: 'var(--text-muted)', opacity: 0.6 }}
      >
        {unitLabels[unit]}
      </span>
    </div>
  );
}

function PaliDetailItem({ label, value, script }: { label: string; value: string; script: string }) {
  return (
    <div
      className="glass-card rounded-2xl p-4 flex flex-col items-center gap-1 shadow-sm"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <span
        className="text-sm font-black uppercase tracking-widest"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </span>
      <PaliText
        text={value}
        script={script}
        className="text-base font-bold"
        style={{ color: 'var(--accent)' } as React.CSSProperties}
      />
    </div>
  );
}
