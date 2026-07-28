import React from 'react';
import { motion } from 'motion/react';
import { MapPin, Search, Loader2, Download, Upload, Info, Database, Globe, Type, Palette, Sun, RefreshCw, FileText } from 'lucide-react';
import { Modal } from './Modal';
import { Settings } from '../types';
import { useI18n } from '../hooks/useI18n';
import { cn } from '../lib/utils';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { LegalModal } from './LegalModal';
import { Toggle } from './Toggle';
import { LabeledSelect } from './LabeledSelect';
import { Button } from './Button';
import SunCalc from 'suncalc';
import { SunTimesCalculator } from '../lib/calendar/SunTimesCalculator';

export function SettingsModal({ 
  show, 
  onClose, 
  settings, 
  onUpdate, 
  onGetLocation 
}: { 
  show: boolean; 
  onClose: () => void;
  settings: Settings;
  onUpdate: (s: Settings) => void;
  onGetLocation: () => void;
}) {
  const { t, language } = useI18n();
  const [addressSearch, setAddressSearch] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const [isGettingLocation, setIsGettingLocation] = React.useState(false);
  const [showLegal, setShowLegal] = React.useState(false);
  const [calibratingTime, setCalibratingTime] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleCalibrateDawn = () => {
    if (!calibratingTime) return;
    const [h, m] = calibratingTime.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    const pos = SunCalc.getPosition(d, settings.lat, settings.lng);
    const angle = Math.abs(pos.altitude * 180 / Math.PI);
    onUpdate({ ...settings, dawnAngle: angle });
  };

  const handleExportData = async () => {
    const backup = {
      version: 1,
      timestamp: Date.now(),
      settings: localStorage.getItem('iit_settings'),
      chants: localStorage.getItem('app_user_chants'),
      chant_sessions: localStorage.getItem('app_chant_sessions'),
      meditation_stats: localStorage.getItem('zen_meditation_stats')
    };

    const jsonStr = JSON.stringify(backup, null, 2);
    const fileName = `iit_calendar_backup_${new Date().toISOString().slice(0, 10)}.json`;

    if (Capacitor.isNativePlatform()) {
      try {
        // Write to cache directory, then share via native share sheet
        const result = await Filesystem.writeFile({
          path: fileName,
          data: jsonStr,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        await Share.share({
          title: 'IIT Calendar Backup',
          text: 'IIT Calendar backup data',
          url: result.uri,
          dialogTitle: 'Export Backup',
        });
      } catch (err: any) {
        console.error('Export failed:', err);
        alert('Export failed: ' + (err.message || 'Unknown error'));
      }
    } else {
      // Web fallback: anchor download
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonStr);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", fileName);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const backup = JSON.parse(content);
        
        if (backup && typeof backup === 'object') {
          if (backup.settings) localStorage.setItem('iit_settings', backup.settings);
          if (backup.chants) localStorage.setItem('app_user_chants', backup.chants);
          if (backup.chant_sessions) localStorage.setItem('app_chant_sessions', backup.chant_sessions);
          if (backup.meditation_stats) localStorage.setItem('zen_meditation_stats', backup.meditation_stats);
          
          alert("Data imported successfully! The application will now reload to apply changes.");
          window.location.reload();
        } else {
          throw new Error("Invalid backup file structure.");
        }
      } catch (err: any) {
        alert("Failed to import data: " + (err.message || "Invalid JSON or corrupt file."));
      }
    };
    reader.readAsText(file);
  };

  const handleSearch = async () => {
    if (!addressSearch.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressSearch)}&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        onUpdate({ ...settings, lat: parseFloat(lat), lng: parseFloat(lon), address: display_name });
        setAddressSearch('');
      } else {
        alert(t('settings.searchError'));
      }
    } catch (error) {
      alert("Error connecting to geocoding service.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <>
      <Modal
        show={show}
        onClose={onClose}
        title={t('common.settings')}
        maxWidth="lg"
      >
        <div className="space-y-6 px-1 pr-2">

                {/* Backup & Restore Section */}
                <section className="space-y-3 p-4 rounded-3xl border bg-[var(--bg-card-alt)]" style={{ borderColor: 'var(--border-subtle)' }}>
                  <SectionLabel icon={Database}>Backup & Restore</SectionLabel>
                  <p className="text-xs px-1" style={{ color: 'var(--text-secondary)' }}>
                    Export your local settings, chanting history, and meditation stats to move them to another device, or import a previously saved backup file.
                  </p>
                  <div className="flex gap-4 pt-1">
                    <button
                      onClick={handleExportData}
                      className="flex-grow py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border transition-all active:scale-95"
                      style={{
                        borderColor: 'var(--accent)',
                        color: 'var(--accent)',
                        backgroundColor: 'transparent'
                      }}
                    >
                      <Download size={14} />
                      Export
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-grow py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 text-white"
                      style={{
                        backgroundColor: 'var(--accent)',
                        boxShadow: '0 4px 12px var(--accent-ring)'
                      }}
                    >
                      <Upload size={14} />
                      Import
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImportData}
                      accept=".json"
                      className="hidden"
                    />
                  </div>
                </section>

                {/* 1. Language & Script */}
                <section className="space-y-3 p-4 rounded-3xl border bg-[var(--bg-card-alt)]" style={{ borderColor: 'var(--border-subtle)' }}>
                  <SectionLabel icon={Globe}>{t('common.language')} & {t('common.script')}</SectionLabel>
                  <div className="grid grid-cols-2 gap-4">
                    <LabeledSelect
                      label={t('settings.language')}
                      value={settings.language}
                      onChange={(val) => onUpdate({ ...settings, language: val })}
                      options={(['en', 'vi', 'th', 'si', 'my', 'km', 'lo'] as const).map(lang => ({
                        value: lang,
                        label: t(`settings.languages.${lang}`)
                      }))}
                      selectClassName="text-sm px-4 py-3 font-sans"
                    />
                    <LabeledSelect
                      label={t('settings.paliScript')}
                      value={settings.paliScript}
                      onChange={(val) => onUpdate({ ...settings, paliScript: val as any })}
                      options={(['roman', 'sinhala', 'burmese', 'thai', 'devanagari', 'lao', 'khmer', 'bengali', 'gurmukhi', 'gujarati', 'telugu', 'kannada', 'malayalam', 'taitham', 'brahmi', 'tibetan', 'cyrillic', 'assamese'] as const).map(s => ({
                        value: s,
                        label: t(`settings.scripts.${s}`)
                      }))}
                      selectClassName="text-sm px-4 py-3 font-sans"
                    />
                  </div>
                </section>

                {/* 1.5 Font Size */}
                <section className="space-y-3 p-4 rounded-3xl border bg-[var(--bg-card-alt)]" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex justify-between items-center">
                    <SectionLabel icon={Type}>Font Size</SectionLabel>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--accent-soft)]" style={{ color: 'var(--accent)' }}>
                      {settings.fontSize}px
                    </span>
                  </div>
                  <div className="pt-1">
                    <input
                      type="range"
                      min="8"
                      max="20"
                      step="1"
                      value={settings.fontSize}
                      onChange={(e) => onUpdate({ ...settings, fontSize: parseInt(e.target.value) })}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                      style={{ accentColor: 'var(--accent)', backgroundColor: 'var(--bg-muted)' }}
                    />
                    <div
                      className="flex justify-between mt-2 text-[10px] font-black uppercase tracking-widest"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      <span>Small</span>
                      <span>Normal</span>
                      <span>Large</span>
                    </div>
                  </div>
                </section>

                {/* 2. Location & Timezone */}
                <section className="space-y-3 p-4 rounded-3xl border bg-[var(--bg-card-alt)]" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-center justify-between">
                    <SectionLabel icon={MapPin} inline>{t('settings.location')}</SectionLabel>
                    <button
                      className="text-xs font-bold hover:underline"
                      style={{ color: 'var(--accent)' }}
                      onClick={onGetLocation}
                    >
                      {t('settings.useCurrent')}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* Address search */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={t('settings.address')}
                        value={addressSearch}
                        onChange={e => setAddressSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        className="w-full pl-4 pr-12 py-3 rounded-2xl text-sm focus:outline-none transition-all bg-[var(--bg-card)]"
                        style={{
                          border: '1px solid var(--border-base)',
                          color: 'var(--text-primary)',
                          caretColor: 'var(--accent)',
                        }}
                        onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent-ring)')}
                        onBlur={e => (e.currentTarget.style.boxShadow = 'none')}
                      />
                      <button
                        onClick={handleSearch}
                        className="absolute right-2 top-1.5 bottom-1.5 px-3 rounded-xl text-white active:scale-95 transition-all"
                        style={{
                          backgroundColor: 'var(--accent)',
                          boxShadow: '0 4px 12px var(--accent-ring)',
                        }}
                      >
                        {isSearching ? <Loader2 size="1em" className="animate-spin" /> : <Search size="1em" />}
                      </button>
                    </div>

                    {/* Current address display */}
                    {settings.address && (
                      <div
                        className="px-4 py-3 rounded-2xl flex items-start gap-3"
                        style={{
                          backgroundColor: 'var(--accent-soft)',
                          border: '1px solid var(--accent-ring)',
                        }}
                      >
                        <MapPin size="1.1em" className="mt-1 shrink-0" style={{ color: 'var(--accent)' }} />
                        <div>
                          <p className="text-xs leading-tight font-medium" style={{ color: 'var(--text-secondary)' }}>
                            {settings.address}
                          </p>
                          <p className="text-xs mt-1 font-mono font-bold" style={{ color: 'var(--accent)' }}>
                            {settings.lat.toFixed(4)}°, {settings.lng.toFixed(4)}°
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* 3. Appearance */}
                <section className="space-y-3 p-4 rounded-3xl border bg-[var(--bg-card-alt)]" style={{ borderColor: 'var(--border-subtle)' }}>
                  <SectionLabel icon={Palette}>{t('common.appearance')}</SectionLabel>
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center w-full">
                      <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                        Solar Noon Alert
                      </span>
                      <Toggle
                        value={settings.solarNoonBell}
                        onToggle={() => onUpdate({ ...settings, solarNoonBell: !settings.solarNoonBell })}
                      />
                    </div>

                    {settings.solarNoonBell && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }} 
                        animate={{ height: 'auto', opacity: 1 }}
                        className="space-y-4 pl-4 border-l-2 ml-1"
                        style={{ borderColor: 'var(--accent)' }}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                            Countdown alerts (5, 4, 3, 2, 1 min)
                          </span>
                          <Toggle
                            value={settings.noonMultiAlert ?? false}
                            onToggle={() => onUpdate({ ...settings, noonMultiAlert: !settings.noonMultiAlert })}
                          />
                        </div>
                        <div className="flex justify-between items-center w-full">
                          <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                            Voice announcements
                          </span>
                          <Toggle
                            value={settings.noonVoiceAlert ?? false}
                            onToggle={() => onUpdate({ ...settings, noonVoiceAlert: !settings.noonVoiceAlert })}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                              Safe Offset
                            </span>
                            <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>
                              {settings.noonSafeOffset || 0} min early
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="5"
                            step="1"
                            value={settings.noonSafeOffset || 0}
                            onChange={(e) => onUpdate({ ...settings, noonSafeOffset: parseInt(e.target.value) })}
                            className="w-full h-1 rounded-lg appearance-none cursor-pointer"
                            style={{ accentColor: 'var(--accent)', backgroundColor: 'var(--bg-muted)' }}
                          />
                        </div>
                      </motion.div>
                    )}

                    <div className="flex justify-between items-center w-full">
                      <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                        Dawn Alert
                      </span>
                      <Toggle
                        value={settings.dawnBell}
                        onToggle={() => onUpdate({ ...settings, dawnBell: !settings.dawnBell })}
                      />
                    </div>

                    <div className="flex justify-between items-center w-full">
                      <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                        {t('settings.iitStudent')}
                      </span>
                      <Toggle
                        value={settings.isIITStudent !== false}
                        onToggle={() => onUpdate({ ...settings, isIITStudent: settings.isIITStudent === false ? true : false })}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-1">
                      {/* Theme color swatches */}
                      <div className="flex gap-2">
                        {(['saffron', 'indigo', 'emerald', 'rose', 'slate'] as const).map(color => (
                          <button
                            key={`theme-opt-${color}`}
                            onClick={() => onUpdate({ ...settings, themeColor: color })}
                            style={{
                              transform: settings.themeColor === color ? 'scale(1.12)' : 'scale(1)',
                            }}
                            className={cn(
                              "w-7 h-7 rounded-full transition-all",
                              color === 'saffron'  && "bg-[#7f5700]",
                              color === 'indigo'   && "bg-indigo-500",
                              color === 'emerald'  && "bg-emerald-500",
                              color === 'rose'     && "bg-rose-500",
                              color === 'slate'    && "bg-slate-700",
                              settings.themeColor === color
                                ? "ring-2 ring-offset-1 ring-[var(--text-primary)]"
                                : "ring-2 ring-[var(--border-subtle)]"
                            )}
                          />
                        ))}
                      </div>

                      {/* Dark/Light toggle */}
                      <button
                        onClick={() => onUpdate({ ...settings, darkMode: !settings.darkMode })}
                        className="px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                        style={{
                          backgroundColor: 'var(--text-primary)',
                          color: 'var(--bg-main)',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                      >
                        {settings.darkMode ? "☀ Light Mode" : "☾ Dark Mode"}
                      </button>
                    </div>
                  </div>
                </section>

                {/* 4. Tradition */}
                <section className="space-y-3 p-4 rounded-3xl border bg-[var(--bg-card-alt)]" style={{ borderColor: 'var(--border-subtle)' }}>
                  <SectionLabel icon={Sun}>{t('settings.tradition')}</SectionLabel>
                  <div className="grid grid-cols-2 gap-3">
                    {(['myanmar', 'thai', 'srilanka', 'lunar'] as const).map(type => (
                      <button
                        key={`cal-type-opt-${type}`}
                        onClick={() => onUpdate({ ...settings, calendarType: type })}
                        className="px-4 py-3 rounded-2xl text-xs font-bold capitalize transition-all"
                        style={
                          settings.calendarType === type
                            ? {
                                backgroundColor: 'var(--accent)',
                                color: '#fff',
                                border: '1px solid var(--accent)',
                                boxShadow: '0 4px 16px var(--accent-ring)',
                              }
                            : {
                                backgroundColor: 'var(--bg-card)',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border-base)',
                              }
                        }
                      >
                        {type === 'srilanka' ? t('calendar.srilanka') : type}
                      </button>
                    ))}
                  </div>
                </section>

                {/* 5. Dawn Calculation */}
                <section className="space-y-3 p-4 rounded-3xl border bg-[var(--bg-card-alt)]" style={{ borderColor: 'var(--border-subtle)' }}>
                  <SectionLabel icon={Sun}>{t('settings.dawnCalculation')}</SectionLabel>
                  <div className="flex flex-col gap-3">
                    {[
                      { id: 'astrology', label: 'Sun Angle (Astrology Method)' },
                      { id: 'offset', label: 'Time Shift (Fixed Minutes Early)' }
                    ].map(opt => {
                      const isSelected = settings.dawnMethod === opt.id;
                      return (
                        <div key={`dawn-opt-wrap-${opt.id}`} className="flex flex-col gap-2">
                          <button
                            key={`dawn-opt-${opt.id}`}
                            onClick={() => onUpdate({ ...settings, dawnMethod: opt.id })}
                            className="px-4 py-3.5 rounded-2xl text-xs font-bold flex justify-between items-center transition-all border"
                            style={
                              isSelected
                                ? {
                                    backgroundColor: 'var(--accent-soft)',
                                    color: 'var(--accent)',
                                    borderColor: 'var(--accent)',
                                  }
                                : {
                                    backgroundColor: 'var(--bg-card)',
                                    color: 'var(--text-secondary)',
                                    borderColor: 'var(--border-subtle)',
                                  }
                            }
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                                isSelected ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--text-tertiary)]"
                              )}>
                                {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                              </div>
                              <span>{opt.label}</span>
                            </div>
                          </button>
                          
                          {isSelected && opt.id === 'astrology' && (
                            <div className="px-4 py-3 bg-[var(--bg-card)] rounded-2xl flex flex-col gap-2 text-sm border border-[var(--border-subtle)]">
                              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                Sun Altitude Angle: <strong style={{ color: 'var(--accent)' }}>{settings.dawnAngle?.toFixed(2) ?? 9.0}°</strong>
                              </span>
                              <div className="flex gap-2">
                                <input 
                                  type="time" 
                                  value={calibratingTime}
                                  onChange={(e) => setCalibratingTime(e.target.value)}
                                  className="flex-1 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)]"
                                />
                                <button 
                                  onClick={handleCalibrateDawn}
                                  className="bg-[var(--accent)] text-white px-3 py-1.5 rounded-lg font-bold text-xs active:scale-95 transition-all"
                                >
                                  Calibrate
                                </button>
                              </div>
                              <span className="text-[11px] text-[var(--text-tertiary)] opacity-80 leading-relaxed">
                                Input today's actual dawn time to calibrate. Preview: <strong>{(() => {
                                  const stc = new SunTimesCalculator(settings.lat, settings.lng);
                                  const previewDawn = stc.getDawn(new Date(), { ...settings, dawnMethod: 'astrology' });
                                  return previewDawn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                })()}</strong>
                              </span>
                            </div>
                          )}
                          
                          {isSelected && opt.id === 'offset' && (
                            <div className="px-4 py-3 bg-[var(--bg-card)] rounded-2xl flex flex-col gap-2 text-sm border border-[var(--border-subtle)]">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Minutes before sunrise</span>
                                <input 
                                  type="number" 
                                  min={20}
                                  max={50}
                                  value={settings.dawnDurationOffset ?? 30}
                                  onChange={(e) => onUpdate({ ...settings, dawnDurationOffset: Number(e.target.value) })}
                                  className="w-16 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-center text-xs font-bold text-[var(--text-primary)]"
                                />
                              </div>
                              <span className="text-[11px] text-[var(--text-tertiary)] opacity-80 leading-relaxed">
                                Preview: <strong>{(() => {
                                  const stc = new SunTimesCalculator(settings.lat, settings.lng);
                                  const previewDawn = stc.getDawn(new Date(), { ...settings, dawnMethod: 'offset' });
                                  return previewDawn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                })()}</strong>
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Update Channel */}
                <section className="space-y-3 p-4 rounded-3xl border bg-[var(--bg-card-alt)]" style={{ borderColor: 'var(--border-subtle)' }}>
                  <SectionLabel icon={RefreshCw}>Update Channel</SectionLabel>
                  <LabeledSelect
                    label="OTA Update Channel"
                    value={settings.updateChannel || 'stable'}
                    onChange={(val) => onUpdate({ ...settings, updateChannel: val as 'stable' | 'dev' })}
                    options={[
                      { value: 'stable', label: 'Stable (Official Releases)' },
                      { value: 'dev', label: 'Dev (Development & Pre-releases)' }
                    ]}
                    selectClassName="text-sm px-4 py-3 font-sans"
                  />
                  <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    {settings.updateChannel === 'dev' 
                      ? 'Dev channel receives test updates (-dev) before official releases.' 
                      : 'Stable channel receives verified official updates.'}
                  </p>
                </section>

                {/* Legal & About */}
                <section className="space-y-3 p-4 rounded-3xl border bg-[var(--bg-card-alt)]" style={{ borderColor: 'var(--border-subtle)' }}>
                  <SectionLabel icon={FileText}>{t('settings.legal.title')}</SectionLabel>
                  <button
                    onClick={() => setShowLegal(true)}
                    className="w-full px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between transition-all border"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Info size={16} className="text-[var(--accent)]" />
                      <span>{t('settings.legal.button')}</span>
                    </div>
                    <div className="text-[var(--accent)]">→</div>
                  </button>
                </section>

                <Button
                  onClick={onClose}
                  variant="primary"
                  size="lg"
                  fullWidth
                  className="shadow-xl"
                >
                  {t('common.confirm')}
                </Button>
        </div>
      </Modal>
      <LegalModal show={showLegal} onClose={() => setShowLegal(false)} />
    </>
  );
}

// ── Small helpers ────────────────────────────────────────────────────────────

function SectionLabel({ children, icon: Icon, inline, centered }: { children: React.ReactNode; icon?: React.ComponentType<{ size?: number | string; className?: string; style?: React.CSSProperties }>; inline?: boolean; centered?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 mb-2", centered && "justify-center pt-2")}>
      {Icon && (
        <div className="p-1.5 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center shrink-0">
          <Icon size={15} style={{ color: 'var(--accent)' }} />
        </div>
      )}
      <h3
        className="text-xs font-black uppercase tracking-widest"
        style={{ color: 'var(--accent)' }}
      >
        {children}
      </h3>
    </div>
  );
}