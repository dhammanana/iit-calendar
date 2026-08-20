import React, { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Home as HomeIcon,
  Settings as SettingsIcon,
  Info,
  User as UserIcon
} from 'lucide-react';
import { ScreenIcon } from './components/common/ScreenIcon';
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
        updateChannel: 'stable',
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
      updateChannel: 'stable',
    };
  });

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      CapacitorUpdater.notifyAppReady()
        .then(() => console.log('Capgo: App ready notified successfully'))
        .catch(err => console.error('Capgo: Failed to notify app ready', err));

      if (settings.updateChannel) {
        CapacitorUpdater.setChannel({ channel: settings.updateChannel })
          .catch(err => console.error('Capgo: Failed to set channel', err));
        CapacitorUpdater.setCustomId({ customId: settings.updateChannel })
          .catch(err => console.error('Capgo: Failed to set channel customId', err));
      }
    }
  }, [settings.updateChannel]);

  useLayoutEffect(() => {
    localStorage.setItem('iit_settings', JSON.stringify(settings));

    // Apply theme
    const root = document.documentElement;
    root.classList.toggle('dark', settings.darkMode);

    // Update meta theme-color tag
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', settings.darkMode ? '#0c0a09' : '#fffffd');
    }

    // Apply font size
    root.style.fontSize = `${settings.fontSize}px`;

    // Set theme colors (Tailwind variables)
    const lightColors: Record<string, string> = {
      saffron: '#7f5700',
      indigo: '#4f46e5',
      emerald: '#059669',
      rose: '#e11d48',
      slate: '#475569'
    };
    const darkColors: Record<string, string> = {
      saffron: '#e8ac41',
      indigo: '#818cf8',
      emerald: '#34d399',
      rose: '#fb7185',
      slate: '#94a3b8'
    };

    const colorMap = settings.darkMode ? darkColors : lightColors;
    const chosenAccent = colorMap[settings.themeColor] || colorMap.saffron;
    root.style.setProperty('--accent', chosenAccent);
    root.style.setProperty('--saffron', chosenAccent);

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

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
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
        className="flex-1 relative overflow-hidden"
      >
        <div id="tab-calendar" className={cn("w-full h-full overflow-y-auto hide-scrollbar", activeTab === 'calendar' ? 'block' : 'hidden')} style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}>
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

        <div id="tab-meditation" className={cn("w-full h-full overflow-y-auto hide-scrollbar", activeTab === 'meditation' ? 'block' : 'hidden')} style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}>
          <MeditationScreen />
        </div>

        <div id="tab-chants" className={cn("w-full h-full overflow-y-auto hide-scrollbar", activeTab === 'chants' ? 'block' : 'hidden')} style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}>
          <ChantsScreen settings={settings} />
        </div>

        <div id="tab-book" className={cn("w-full h-full overflow-y-auto hide-scrollbar", activeTab === 'book' ? 'block' : 'hidden')} style={{ paddingBottom: 'calc(8.5rem + env(safe-area-inset-bottom))' }}>
          <BookScreen settings={settings} isActive={activeTab === 'book'} />
        </div>

        <div id="tab-study" className={cn("w-full h-full overflow-y-auto hide-scrollbar", activeTab === 'study' ? 'block' : 'hidden')} style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}>
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

      {/* Floating Bottom Nav (iOS / OneUI Style) */}
      <div
        className="fixed left-0 right-0 z-50 pointer-events-none flex justify-center px-3 sm:px-4"
        style={{
          bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <nav
          className={cn(
            "pointer-events-auto w-full max-w-md sm:max-w-lg",
            "flex justify-around items-center",
            "px-2 py-1.5 sm:px-3 sm:py-2",
            "rounded-full",
            "bg-white/80 dark:bg-[#181512]/80",
            "backdrop-blur-2xl backdrop-saturate-150",
            "border border-stone-200/70 dark:border-white/10",
            "shadow-[0_10px_30px_-5px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.8)]",
            "dark:shadow-[0_16px_40px_-5px_rgba(0,0,0,0.6),0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.08)]",
            "transition-all duration-300"
          )}
        >
          <NavButton active={activeTab === 'calendar'} onClick={() => handleTabClick('calendar')} icon={<HomeIcon size={20} />} label={t('common.home') || 'Home'} />
          <NavButton active={activeTab === 'meditation'} onClick={() => handleTabClick('meditation')} icon={<ScreenIcon name="meditation" size={20} />} label={t('common.stillness') || 'Stillness'} />
          <NavButton active={activeTab === 'chants'} onClick={() => handleTabClick('chants')} icon={<ScreenIcon name="chants" size={22} />} label={t('common.chants') || 'Chants'} />
          <NavButton active={activeTab === 'book'} onClick={() => handleTabClick('book')} icon={<ScreenIcon name="books" size={20} />} label={t('common.books') || t('common.book') || 'Books'} />
          <NavButton active={activeTab === 'study'} onClick={() => handleTabClick('study')} icon={<ScreenIcon name="study" size={20} />} label={t('common.study') || 'Study'} />
        </nav>
      </div>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center flex-1 py-1.5 px-1 sm:px-2 rounded-full relative group select-none outline-none active:scale-95 transition-all duration-200 min-w-[56px]",
        active
          ? "bg-[var(--accent-soft)] text-[var(--accent)] font-bold"
          : "text-stone-400 dark:text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
      )}
    >
      <div className="flex items-center justify-center transition-transform duration-200">
        {icon}
      </div>
      <span className={cn(
        "text-[9px] sm:text-[9.5px] font-bold mt-0.5 tracking-wider uppercase transition-colors duration-200",
        active ? "text-[var(--accent)] font-extrabold" : "text-stone-400 dark:text-stone-400"
      )}>
        {label}
      </span>
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
