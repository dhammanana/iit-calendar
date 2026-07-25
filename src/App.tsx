import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon,
  Settings as SettingsIcon,
  Wind,
  Timer,
  BookOpen,
  Book,
  Info,
  User as UserIcon
} from 'lucide-react';
import { ThaiCalendar } from './lib/calendar/ThaiCalendar';
import { MyanmarCalendar } from './lib/calendar/MyanmarCalendar';
import { SriLankanCalendar } from './lib/calendar/SriLankanCalendar';
import { TraditionalLunarCalendar } from './lib/calendar/TraditionalLunarCalendar';
import { SunTimesCalculator } from './lib/calendar/SunTimesCalculator';
import { cn } from './lib/utils';

// New specialized components and hooks
import { Settings, CalendarType } from './types';
import { useI18n } from './hooks/useI18n';
import { useWidgetSync } from './hooks/useWidgetSync';
import { SettingsModal } from './components/SettingsModal';
import { CalendarScreen } from './screens/CalendarScreen';
import { MeditationScreen } from './screens/MeditationScreen';
import { ChantsScreen } from './screens/ChantsScreen';
import { StudyScreen } from './screens/StudyScreen';
import { BookScreen } from './screens/BookScreen';
import { CSS_VARS } from './theme/index';
import { alarmService } from './services/alarm/AlarmService';
import { useUI } from './UIContext';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

const TABS = ['calendar', 'meditation', 'chants', 'book', 'study'] as const;

export default function App() {
  const { t } = useI18n();
  useWidgetSync();

  // Persistence
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('iit_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure new settings have defaults
      return {
        calendarType: 'srilanka',
        lat: 6.9271,
        lng: 79.8612,
        dawnMethod: 'astrology',
        language: 'en',
        paliScript: 'roman',
        themeColor: 'saffron',
        darkMode: false,
        fontSize: 16,
        solarNoonBell: false,
        dawnBell: false,
        isIITStudent: true,
        ...parsed
      };
    }
    return {
      calendarType: 'srilanka',
      lat: 6.9271,
      lng: 79.8612,
      dawnMethod: 'astrology',
      language: 'en',
      paliScript: 'roman',
      themeColor: 'saffron',
      darkMode: false,
      fontSize: 16,
      solarNoonBell: false,
      dawnBell: false,
      isIITStudent: true,
    };
  });

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      CapacitorUpdater.notifyAppReady()
        .then(() => console.log('Capgo: App ready notified successfully'))
        .catch(err => console.error('Capgo: Failed to notify app ready', err));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('iit_settings', JSON.stringify(settings));

    // Apply theme
    const root = document.documentElement;
    root.classList.toggle('dark', settings.darkMode);

    // Apply font size
    root.style.fontSize = `${settings.fontSize}px`;

    // Set theme colors (Tailwind variables)
    const colors: Record<string, string> = {
      saffron: '#7f5700',
      indigo: '#6366f1',
      emerald: '#10b981',
      rose: '#f43f5e',
      slate: '#475569'
    };

    root.style.setProperty('--accent', colors[settings.themeColor]);

    // Refresh notifications when settings change
    alarmService.refreshDawnAndNoon(settings);
  }, [settings]);

  useEffect(() => {
    // Initial refresh and permissions
    const init = async () => {
      await alarmService.requestPermission();
      await alarmService.refreshDawnAndNoon(settings);
      await alarmService.recheckMeditation();
      await alarmService.recheckStudy();
    };
    init();

    // Listen for app state changes (resume)
    const listener = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        alarmService.refreshDawnAndNoon(settings);
      }
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, []);

  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [activeTab, setActiveTab] = React.useState('calendar');
  const { showSettings, setShowSettings } = useUI();

  useEffect(() => {
    const main = document.getElementById('main-tabs');
    if (!main) return;

    if (!('onscrollsnapchange' in window)) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const tabId = entry.target.id.replace('tab-', '');
            setActiveTab(tabId);
          }
        });
      }, { root: main, threshold: 0.5 });

      TABS.forEach(tab => {
        const el = document.getElementById(`tab-${tab}`);
        if (el) observer.observe(el);
      });

      return () => observer.disconnect();
    } else {
      const handleSnapChange = (e: any) => {
        const target = e.snapTargetInline || e.snapTargetBlock;
        if (target) {
          const tabId = target.id.replace('tab-', '');
          setActiveTab(tabId);
        }
      };
      main.addEventListener('scrollsnapchange', handleSnapChange as any);
      return () => main.removeEventListener('scrollsnapchange', handleSnapChange as any);
    }
  }, []);

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    const el = document.getElementById(`tab-${tab}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  // Choose engine based on settings
  const calendarEngine = useMemo(() => {
    const config = { lat: settings.lat, lng: settings.lng };
    switch (settings.calendarType) {
      case 'myanmar': return new MyanmarCalendar(config);
      case 'thai': return new ThaiCalendar(config);
      case 'srilanka': return new SriLankanCalendar(config);
      case 'lunar': return new TraditionalLunarCalendar(config);
      default: return new ThaiCalendar(config);
    }
  }, [settings]);

  const sunCalc = useMemo(() => new SunTimesCalculator(settings.lat, settings.lng), [settings.lat, settings.lng]);

  const getCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setSettings(s => ({ ...s, lat: latitude, lng: longitude, address: 'Current Location' }));
      },
      (err) => {
        console.error(err);
        alert("Could not get location. Ensure permissions are granted.");
      }
    );
  };

  return (
    <div
      className="flex flex-col h-[100dvh] overflow-hidden font-sans transition-colors duration-500 UT"
      lang={settings.language}
      style={{ backgroundColor: 'var(--bg-main)' }}
    >
      <style>{CSS_VARS}</style>

      <main
        id="main-tabs"
        className="flex-1 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory hide-scrollbar"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div id="tab-calendar" className="min-w-full w-full h-full flex-shrink-0 snap-center overflow-y-auto hide-scrollbar" style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}>
          <CalendarScreen
            settings={settings}
            onUpdateSettings={setSettings}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            calendarEngine={calendarEngine}
            sunCalc={sunCalc}
          />
        </div>

        <div id="tab-meditation" className="min-w-full w-full h-full flex-shrink-0 snap-center overflow-y-auto hide-scrollbar" style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}>
          <MeditationScreen />
        </div>

        <div id="tab-chants" className="min-w-full w-full h-full flex-shrink-0 snap-center overflow-y-auto hide-scrollbar" style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}>
          <ChantsScreen settings={settings} />
        </div>

        <div id="tab-book" className="min-w-full w-full h-full flex-shrink-0 snap-center overflow-y-auto hide-scrollbar" style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}>
          <BookScreen settings={settings} />
        </div>

        <div id="tab-study" className="min-w-full w-full h-full flex-shrink-0 snap-center overflow-y-auto hide-scrollbar" style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}>
          <StudyScreen />
        </div>
      </main>

      <SettingsModal
        show={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onUpdate={setSettings}
        onGetLocation={getCurrentLocation}
      />

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass-card flex justify-around items-center border-t border-slate-100/50 dark:border-slate-800/50 bg-white/85 dark:bg-slate-950/85 shadow-[0_-8px_32px_rgba(0,0,0,0.04)] dark:shadow-[0_-8px_32px_rgba(0,0,0,0.25)] backdrop-blur-md overflow-x-auto"
        style={{
          paddingTop: '0.65rem',
          paddingBottom: 'calc(0.65rem + env(safe-area-inset-bottom))',
          paddingLeft: '1rem',
          paddingRight: '1rem',
        }}
      >
        <NavButton active={activeTab === 'calendar'} onClick={() => handleTabClick('calendar')} icon={<CalendarIcon size={20} />} label={t('common.calendar') || 'Calendar'} />
        <NavButton active={activeTab === 'meditation'} onClick={() => handleTabClick('meditation')} icon={<Timer size={20} />} label={t('common.stillness') || 'Stillness'} />
        <NavButton active={activeTab === 'chants'} onClick={() => handleTabClick('chants')} icon={<Wind size={20} />} label={t('common.chants') || 'Chants'} />
        <NavButton active={activeTab === 'book'} onClick={() => handleTabClick('book')} icon={<Book size={20} />} label={t('common.books') || t('common.book') || 'Books'} />
        <NavButton active={activeTab === 'study'} onClick={() => handleTabClick('study')} icon={<BookOpen size={20} />} label={t('common.study') || 'Study'} />
      </nav>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-[0.97] relative group min-w-[64px]">
      <div className={cn(
        "px-5 py-1 rounded-full transition-all duration-300 flex items-center justify-center",
        active
          ? "bg-[var(--accent-soft)] text-saffron scale-105"
          : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400"
      )}>
        {icon}
      </div>
      <span className={cn(
        "text-[9px] font-bold mt-1 tracking-wider uppercase transition-colors duration-200",
        active ? "text-saffron font-extrabold" : "text-slate-400 dark:text-slate-500"
      )}>{label}</span>
    </button>
  );
}

function PlaceholderTab({ icon, title, text }: { icon: React.ReactNode, title: string, text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-[192px] h-[192px] flex items-center justify-center mb-8 overflow-hidden">
        <img src="/logo.png" alt="IIT Logo" className="w-[144px] h-[144px] object-contain opacity-20" />
      </div>          <h2 className="font-serif text-3xl font-bold text-slate-800 dark:text-slate-200 mb-4">{title}</h2>
      <p className="text-slate-400 dark:text-slate-500 max-w-sm leading-relaxed">{text}</p>
      <button className="mt-10 px-8 py-4 bg-white dark:bg-slate-800 rounded-full text-sm font-black text-saffron uppercase tracking-widest border border-saffron/20 shadow-sm active:scale-95 transition-all">Coming Soon</button>
    </motion.div>
  );
}
