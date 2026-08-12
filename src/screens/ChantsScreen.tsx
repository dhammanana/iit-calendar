import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { chantService, getChantTitle, isChantNamePali } from '../services/ChantService';
import { UserChant, ChantSession, UserChantStats } from '../types';
import { ChantCounter } from '../components/chanting/ChantCounter';
import { ChantList } from '../components/chanting/ChantList';
import { ChantInsights } from '../components/chanting/ChantInsights';
import { Plus, X, BarChart2, List, Trash2, Edit3, Lock, LogIn, ChevronDown, ChevronUp, Settings2, Settings as SettingsIcon } from 'lucide-react';
import { isSameDay, subDays } from 'date-fns';
import { cn } from '../lib/utils';
import { useUI } from '../UIContext';
import { convertPali, SCRIPTS } from '../services/conversionService';
import { Script } from '../lib/pali-script';
import { Settings } from '../types';
import { useI18n } from '../hooks/useI18n';
import { SegmentedControl } from '../components/SegmentedControl';
import { Toggle } from '../components/Toggle';
import { LabeledSelect } from '../components/LabeledSelect';
import { PaliText } from '../components/PaliText';
import { Button } from '../components/Button';

export function ChantsScreen({ settings }: { settings: Settings }) {
  const { t } = useI18n();
  const { setShowSettings } = useUI();
  const [chants, setChants] = useState<UserChant[]>([]);
  const [sessions, setSessions] = useState<ChantSession[]>([]);
  const [selectedChantId, setSelectedChantId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('chant_selected_chant_id');
    } catch {
      return null;
    }
  });
  const [activeSessionCount, setActiveSessionCount] = useState(0);
  const [view, setView] = useState<'counter' | 'insights' | 'config'>('counter');
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedPali, setExpandedPali] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isStopwatch, setIsStopwatch] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('chant_is_stopwatch');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [timerSettings, setTimerSettings] = useState<{ hours: number; minutes: number }>(() => {
    try {
      const saved = localStorage.getItem('chant_timer_settings');
      return saved ? JSON.parse(saved) : { hours: 0, minutes: 15 };
    } catch {
      return { hours: 0, minutes: 15 };
    }
  });

  // Save chant settings to localStorage when changed
  useEffect(() => {
    if (selectedChantId !== null) {
      localStorage.setItem('chant_selected_chant_id', selectedChantId);
    } else {
      localStorage.removeItem('chant_selected_chant_id');
    }
  }, [selectedChantId]);

  useEffect(() => {
    localStorage.setItem('chant_is_stopwatch', JSON.stringify(isStopwatch));
  }, [isStopwatch]);

  useEffect(() => {
    localStorage.setItem('chant_timer_settings', JSON.stringify(timerSettings));
  }, [timerSettings]);

  // New / Edit chant form
  const [editingChantId, setEditingChantId] = useState<string | null>(null);
  const [newChant, setNewChant] = useState({ title: '', content: '', milestone: 108, isNamePali: false });

  useEffect(() => {
    // Load history and stats (works offline too)
    const init = async () => {
      const history = await chantService.getSessionHistory();
      setSessions(history);
      setLoading(false);
    };
    init();

    const unsub = chantService.subscribeToUserChants((updated) => {
      setChants(updated);
      const activeChants = updated.filter(c => !c.isDeleted);
      if (activeChants.length > 0) {
        setSelectedChantId(currentId => {
          const savedId = localStorage.getItem('chant_selected_chant_id') || currentId;
          if (savedId && activeChants.some(c => c.id.toString() === savedId.toString())) {
            return savedId;
          }
          if (!currentId || !activeChants.some(c => c.id.toString() === currentId.toString())) {
            const defaultChant = activeChants.find(c => c.nameKey === 'chant.itipiso' || c.title.toLowerCase().includes('itipiso') || c.id.toString() === '1') || activeChants[0];
            return defaultChant ? defaultChant.id.toString() : null;
          }
          return currentId;
        });
      } else {
        setSelectedChantId(null);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (showAddModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [showAddModal]);

  const stats: UserChantStats = useMemo(() => {
    let streak = 0;
    const distribution: Record<string, number> = {};
    
    // Calculate streak
    if (sessions.length > 0) {
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const day = subDays(today, i);
        const hasActivity = sessions.some(s => isSameDay(new Date(s.timestamp), day));
        if (hasActivity) streak++;
        else if (i > 0) break; // Streak broken
      }
    }

    return {
      totalSessions: sessions.length,
      streakDays: streak,
      distribution
    };
  }, [chants, sessions]);

  const selectedChant = chants.filter(c => !c.isDeleted).find(c => c.id.toString() === selectedChantId?.toString());

  const handleCommitSession = async (durationMin?: number) => {
    if (!selectedChantId || activeSessionCount === 0) return;

    await chantService.logSession(selectedChantId, activeSessionCount, durationMin);
    setActiveSessionCount(0);
    // Refresh history
    const history = await chantService.getSessionHistory();
    setSessions(history);
  };

  const handleOpenAddModal = () => {
    setEditingChantId(null);
    setNewChant({ title: '', content: '', milestone: 108, isNamePali: false });
    setShowAddModal(true);
  };

  const handleOpenEditModal = (chant: UserChant) => {
    setEditingChantId(chant.id);
    setNewChant({
      title: chant.title || '',
      content: chant.content || chant.chant || '',
      milestone: chant.milestone || 108,
      isNamePali: chant.isNamePali !== undefined ? chant.isNamePali : false
    });
    setShowAddModal(true);
  };

  const handleSaveChant = async () => {
    if (!newChant.title) return;

    // Convert content to Roman script if it's not empty
    let convertedContent = newChant.content;
    if (convertedContent) {
      convertedContent = await convertPali(convertedContent, 'roman');
    }

    if (editingChantId) {
      await chantService.updateChant(editingChantId, {
        title: newChant.title,
        content: convertedContent,
        milestone: newChant.milestone,
        isNamePali: newChant.isNamePali
      });
    } else {
      await chantService.addChant({
        ...newChant,
        content: convertedContent,
        isCustom: true
      });
    }
    
    setEditingChantId(null);
    setNewChant({ title: '', content: '', milestone: 108, isNamePali: false });
    setShowAddModal(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20">{t('chant.loading')}</div>;

  return (
    <div className="flex flex-col relative bg-[var(--bg-main)]">

      {/* Dynamic/Notch-compatible Vector Illustration Header (Chants: ripple/lotus theme) */}
      <div
        className="w-full safe-header bg-gradient-to-tr from-rose-500/20 via-lotus-base/20 to-amber-500/10 dark:from-[#260a15] dark:via-[#18050d] dark:to-[#0a0206] sticky top-0 z-10 flex items-center justify-center"
      >
        {/* Styled CSS/SVG Zen Concentric Rings Art */}
        <svg className="absolute w-[160px] h-[160px] sm:w-[190px] sm:h-[190px] md:w-[220px] md:h-[220px] lg:w-[240px] lg:h-[240px] -translate-y-3" viewBox="0 0 100 100">
          <defs>
            {/* Soft shadow filter for the circular pill container */}
            <filter id="chant-pill-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2.5" stdDeviation="3" floodColor="#4c0519" floodOpacity="0.07" />
            </filter>

            {/* Gradients for the circular pill container */}
            <linearGradient id="chant-pill-bg-light" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#ffe4e6" />
            </linearGradient>
            <linearGradient id="chant-pill-bg-dark" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2b121a" />
              <stop offset="100%" stopColor="#18090f" />
            </linearGradient>
          </defs>

          <style dangerouslySetInnerHTML={{
            __html: `
            @keyframes chant-wave-pulse {
              0%   { r: 0px; opacity: 0.6; }
              100% { r: 46px; opacity: 0; }
            }
            .chant-ripple {
              animation: chant-wave-pulse 8s cubic-bezier(0.25, 0, 0.2, 1) infinite;
              transform-origin: 50px 50px;
            }
            .chant-pill-circle {
              fill: url(#chant-pill-bg-light);
              stroke: rgba(255, 255, 255, 0.8);
            }
            .dark .chant-pill-circle {
              fill: url(#chant-pill-bg-dark);
              stroke: rgba(251, 113, 133, 0.4);
            }
          ` }} />

          {/* Ripple waves pulsing outwards from the pill edge (r=18) - 5 waves total */}
          <circle cx="50" cy="50" r="0" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0" className="chant-ripple text-rose-500/25 dark:text-rose-400/20" style={{ animationDelay: '0s' }} />
          <circle cx="50" cy="50" r="0" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0" className="chant-ripple text-rose-500/25 dark:text-rose-400/20" style={{ animationDelay: '1.6s' }} />
          <circle cx="50" cy="50" r="0" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0" className="chant-ripple text-rose-500/25 dark:text-rose-400/20" style={{ animationDelay: '3.2s' }} />
          <circle cx="50" cy="50" r="0" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0" className="chant-ripple text-rose-500/25 dark:text-rose-400/20" style={{ animationDelay: '4.8s' }} />
          <circle cx="50" cy="50" r="0" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0" className="chant-ripple text-rose-500/25 dark:text-rose-400/20" style={{ animationDelay: '6.4s' }} />

          {/* Pill Container (Circle) with Soft Shadow and Rose Gradient Fill */}
          <circle
            cx="50"
            cy="50"
            r="18"
            className="chant-pill-circle"
            strokeWidth="0.4"
            filter="url(#chant-pill-shadow)"
          />

          {/* Lotus vector icon inside the pill matching rose theme */}
          <g transform="translate(39, 61) scale(0.004296875, -0.004296875)" fill="currentColor" className="text-rose-700 dark:text-rose-300">
            <path d="M2495 4501 c-41 -25 -54 -41 -120 -151 -237 -391 -448 -888 -534 -1260 -70 -304 -72 -622 -6 -880 73 -286 232 -566 444 -783 l65 -67 -32 0 c-50 0 -216 38 -311 72 -636 223 -921 812 -976 2021 -4 79 -2 127 4 127 22 0 324 -127 453 -191 77 -38 151 -69 165 -69 30 0 73 42 73 70 0 46 -24 63 -194 145 -214 103 -452 195 -504 195 -48 0 -98 -32 -126 -80 -19 -32 -21 -49 -19 -190 6 -369 61 -783 144 -1076 134 -478 355 -793 694 -990 l80 -46 -140 5 c-260 10 -457 86 -713 276 -117 86 -403 375 -534 539 -122 153 -258 350 -258 373 0 48 53 65 374 115 178 27 196 36 196 94 0 75 -35 82 -240 50 -222 -34 -359 -67 -395 -94 -46 -36 -75 -86 -82 -145 -5 -44 -1 -60 25 -113 56 -112 234 -349 428 -568 107 -122 170 -183 297 -290 87 -73 88 -71 -24 -85 -125 -16 -182 -174 -92 -256 87 -80 320 -229 483 -310 351 -174 627 -193 886 -61 l39 20 40 -35 c62 -54 232 -180 280 -208 24 -14 78 -33 119 -41 69 -14 83 -14 152 0 41 8 95 27 119 41 46 27 216 153 275 204 19 17 40 31 46 31 7 0 37 -12 68 -26 98 -45 185 -65 303 -71 266 -13 543 96 913 362 132 95 143 106 160 158 28 87 -35 180 -129 192 -112 14 -111 12 -24 85 127 107 190 168 297 290 194 219 372 456 428 568 26 53 30 69 25 113 -7 59 -36 109 -82 145 -36 27 -173 60 -395 94 -206 32 -240 25 -240 -52 0 -56 19 -65 196 -92 322 -50 374 -67 374 -116 0 -18 -83 -142 -188 -282 -170 -226 -438 -505 -604 -629 -253 -188 -453 -266 -713 -276 l-140 -5 80 46 c339 197 560 512 694 990 83 293 138 707 144 1076 2 141 0 158 -19 190 -33 56 -80 83 -139 78 -98 -9 -650 -251 -674 -296 -28 -53 3 -112 59 -112 17 0 89 29 168 69 125 62 430 191 453 191 16 0 -8 -417 -37 -640 -83 -639 -263 -1061 -554 -1294 -174 -140 -398 -241 -613 -276 -119 -19 -120 -18 -46 58 212 216 371 496 444 782 67 259 64 575 -6 880 -50 216 -136 463 -245 705 -107 238 -312 612 -368 673 -48 53 -117 67 -171 33z m83 -161 c64 -103 191 -336 258 -475 303 -627 407 -1135 319 -1558 -40 -188 -142 -417 -262 -587 -70 -98 -310 -350 -333 -350 -23 0 -263 252 -333 350 -79 111 -186 321 -221 435 -103 327 -94 661 29 1084 76 259 246 648 413 938 120 210 109 196 130 163z m-1455 -2999 c212 -103 359 -136 607 -135 142 0 193 5 267 22 65 15 101 18 125 12 18 -4 46 -11 62 -15 l29 -6 -34 -36 c-134 -140 -357 -243 -526 -243 -164 0 -384 76 -613 213 -86 51 -276 182 -285 197 -4 7 166 36 233 39 21 0 69 -16 135 -48z m3124 33 c67 -10 120 -21 118 -25 -9 -14 -200 -145 -285 -196 -229 -137 -449 -213 -613 -213 -169 0 -392 103 -526 243 l-34 36 29 6 c16 4 44 11 62 15 24 6 60 3 125 -13 121 -28 419 -30 537 -3 126 28 237 67 333 116 51 26 101 48 112 49 11 1 75 -6 142 -15z m-1484 -213 c17 -20 64 -69 104 -109 l74 -72 -32 -28 c-64 -54 -185 -142 -234 -169 -71 -38 -159 -38 -230 0 -49 27 -170 115 -233 169 l-31 26 99 102 c55 56 100 105 100 110 0 4 79 8 176 8 l177 -1 30 -36z" />
          </g>
        </svg>
      </div>

      {/* Card Overlay container (Oval at the top overlapping the header) */}
      <div className="relative z-20 mt-[-2.5rem] bg-[var(--bg-main)] rounded-t-[3rem] px-4 pt-6 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.25)] flex flex-col gap-6">

        {/* Title & Tagline info inside the card */}
        <div className="px-2 text-center flex flex-col items-center relative w-full pr-12 pl-12">
          <h1 className="font-serif text-3xl font-bold text-[var(--text-primary)] leading-none mb-1.5">
            {t('common.chants') || 'Chants'}
          </h1>
          <Button
            onClick={() => setShowSettings(true)}
            variant="outline"
            icon={SettingsIcon}
            aria-label="Settings"
            className="absolute top-0 right-2 shadow-sm"
          />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] leading-none">
            {t('chant.focusMind') || 'Sacred Recitations'}
          </p>
        </div>

        {/* ── Original Chants Content wrapper ── */}
        <div className="max-w-2xl w-full mx-auto space-y-6">

          {/* Mode Switcher */}
          <div className="h-14 flex items-center justify-center">
            <SegmentedControl
              options={[
                { id: 'counter', icon: List, label: t('chant.chant') || 'Chant' },
                { id: 'insights', icon: BarChart2, label: t('chant.insights') || 'Insights' },
                { id: 'config', icon: Settings2, label: t('meditation.configure') || 'Settings' },
              ]}
              value={view}
              onChange={(val) => setView(val as any)}
            />
          </div>

          <AnimatePresence mode="wait">
            {view === 'counter' && (
              <motion.div
                key="counter"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-0"
              >
                {selectedChant && (
                  <ChantCounter
                    currentCount={activeSessionCount}
                    onCountChange={setActiveSessionCount}
                    targetCount={selectedChant.milestone || 108}
                    onCommit={handleCommitSession}
                    timerSettings={isStopwatch ? { hours: 0, minutes: 0 } : timerSettings}
                  >
                    {/* Selected Chant Display */}
                    <div 
                      className="rounded-[2.5rem] p-8 border flex flex-col gap-6 w-full"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--border-subtle)'
                      }}
                    >
                      <h3 className="font-serif text-2xl" style={{ color: 'var(--accent)' }}>
                        <PaliText text={getChantTitle(selectedChant, t)} script={settings.paliScript} isPali={isChantNamePali(selectedChant)} />
                      </h3>
                      {(selectedChant.content || (selectedChant as any).chant) && (
                        <div 
                          className="pt-6 border-t whitespace-pre-wrap leading-relaxed text-lg"
                          style={{
                            color: 'var(--text-secondary)',
                            borderColor: 'var(--border-subtle)'
                          }}
                        >
                          <PaliText text={selectedChant.content || (selectedChant as any).chant || ''} script={settings.paliScript} />
                        </div>
                      )}
                    </div>
                  </ChantCounter>
                )}
              </motion.div>
            )}

            {view === 'insights' && (
              <motion.div
                key="insights"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <ChantInsights chants={chants} sessions={sessions} stats={stats} />
              </motion.div>
            )}

            {view === 'config' && (
              <motion.div
                key="config"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 gap-6"
              >
                <div className="glass-card rounded-[2.5rem] p-6 bg-white/40 dark:bg-slate-900/40 border border-white/60 dark:border-slate-800 animate-in fade-in duration-500">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-serif text-xl text-stone-900 dark:text-stone-100">
                      {t('meditation.sessionSettings') || 'Session Settings'}
                    </h3>
                    <Settings2 size={20} className="text-primary-400" />
                  </div>

                  <div className="space-y-6">
                    {/* Stopwatch Mode Toggle */}
                    <div className="flex justify-between items-center pb-2">
                      <div>
                        <h4 className="font-serif text-sm font-bold text-[var(--text-primary)] leading-tight">Stopwatch Mode</h4>
                        <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-1">Chant without duration limit</p>
                      </div>
                      <Toggle value={isStopwatch} onToggle={() => setIsStopwatch(!isStopwatch)} />
                    </div>

                    {/* Duration Section (Only visible if not stopwatch) */}
                    <AnimatePresence initial={false}>
                      {!isStopwatch && (
                        <motion.div
                          initial={{ height: 0, opacity: 0, marginTop: 0 }}
                          animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                          exit={{ height: 0, opacity: 0, marginTop: 0 }}
                          className="overflow-hidden border-t border-slate-100 dark:border-slate-800 pt-4"
                        >
                          <label className="block text-[10px] font-black uppercase tracking-widest mb-3 text-stone-500 dark:text-stone-400">
                            Chant Duration
                          </label>
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <LabeledSelect
                                value={timerSettings.hours}
                                onChange={(val) => setTimerSettings({ ...timerSettings, hours: parseInt(val) || 0 })}
                                options={Array.from({ length: 24 }).map((_, i) => ({
                                  value: i,
                                  label: i.toString().padStart(2, '0')
                                }))}
                                badgeLabel="Hours"
                              />
                            </div>
                            <span className="text-2xl font-serif text-slate-300 dark:text-slate-700">:</span>
                            <div className="flex-1">
                              <LabeledSelect
                                value={timerSettings.minutes}
                                onChange={(val) => setTimerSettings({ ...timerSettings, minutes: parseInt(val) || 0 })}
                                options={[0, 1, 5, 10, 15, 20, 25, 30, 45].map(m => ({
                                  value: m,
                                  label: m.toString().padStart(2, '0')
                                }))}
                                badgeLabel="Minutes"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="glass-card rounded-[2.5rem] p-6 bg-white/40 dark:bg-slate-900/40 border border-white/60 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="font-serif text-xl text-stone-900 dark:text-stone-100">{t('chant.selectChant')}</h4>
                    <List size={20} className="text-primary-400" />
                  </div>
                  <ChantList
                    chants={chants}
                    selectedChantId={selectedChantId}
                    onSelect={setSelectedChantId}
                    onAddChant={handleOpenAddModal}
                    onEditChant={handleOpenEditModal}
                    paliScript={settings.paliScript}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Add / Edit Modal */}
          {showAddModal && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-sm"
              style={{ background: 'rgba(0,0,0,0.45)' }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowAddModal(false);
                  setEditingChantId(null);
                }
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-6 border"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-subtle)'
                }}
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-serif text-xl font-bold text-[var(--text-primary)]">
                    {editingChantId ? (t('chant.editChant') || 'Edit Chant') : t('chant.newChant')}
                  </h3>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingChantId(null);
                    }}
                    className="p-2 rounded-full hover:bg-[var(--bg-muted)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[0.65rem] font-black uppercase tracking-widest block mb-2 px-1" style={{ color: 'var(--text-secondary)' }}>{t('chant.chantName')}</label>
                    <input
                      type="text"
                      value={newChant.title}
                      onChange={e => setNewChant({ ...newChant, title: e.target.value })}
                      placeholder="e.g. Itipiso"
                      className="w-full px-5 py-4 rounded-2xl text-stone-900 dark:text-stone-100 border focus:ring-2 focus:ring-[var(--accent)]/20"
                      style={{
                        backgroundColor: 'var(--bg-card-alt)',
                        borderColor: 'var(--border-subtle)'
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">{t('chant.titleInPali') || 'Title is in Pali'}</h4>
                      <p className="text-[10px] text-stone-500 dark:text-stone-400">{t('chant.transliterateTitleDesc') || 'Transliterate title into selected script'}</p>
                    </div>
                    <Toggle value={newChant.isNamePali} onToggle={() => setNewChant({ ...newChant, isNamePali: !newChant.isNamePali })} />
                  </div>
                  <div>
                    <label className="text-[0.65rem] font-black uppercase tracking-widest block mb-2 px-1" style={{ color: 'var(--text-secondary)' }}>{t('chant.chantContent')}</label>
                    <textarea
                      value={newChant.content}
                      onChange={e => setNewChant({ ...newChant, content: e.target.value })}
                      placeholder="Enter Pali text..."
                      rows={4}
                      className="w-full px-5 py-4 rounded-2xl text-stone-900 dark:text-stone-100 border focus:ring-2 focus:ring-[var(--accent)]/20 resize-none"
                      style={{
                        backgroundColor: 'var(--bg-card-alt)',
                        borderColor: 'var(--border-subtle)'
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-[0.65rem] font-black uppercase tracking-widest block mb-2 px-1" style={{ color: 'var(--text-secondary)' }}>{t('chant.milestone')}</label>
                    <input
                      type="number"
                      value={newChant.milestone}
                      onChange={e => setNewChant({ ...newChant, milestone: parseInt(e.target.value) || 108 })}
                      className="w-full px-5 py-4 rounded-2xl text-stone-900 dark:text-stone-100 border focus:ring-2 focus:ring-[var(--accent)]/20"
                      style={{
                        backgroundColor: 'var(--bg-card-alt)',
                        borderColor: 'var(--border-subtle)'
                      }}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSaveChant}
                  disabled={!newChant.title}
                  variant="primary"
                  size="lg"
                  fullWidth
                >
                  {editingChantId ? (t('chant.saveChant') || 'Save Changes') : t('chant.createChant')}
                </Button>
              </motion.div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
