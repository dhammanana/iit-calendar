import React from 'react';
import { motion } from 'motion/react';
import { MapPin, Search, Loader2, Download, Upload, Info } from 'lucide-react';
import { Modal } from './Modal';
import { Settings } from '../types';
import { useI18n } from '../hooks/useI18n';
import { cn } from '../lib/utils';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { LegalModal } from './LegalModal';
import { Toggle } from './Toggle';
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
        <div className="space-y-8 pr-1">

                {/* Backup & Restore Section */}
                <section className="space-y-4">
                  <SectionLabel>Backup & Restore</SectionLabel>
                  <div
                    className="rounded-[1.5rem] p-5 border flex flex-col gap-4"
                    style={{ backgroundColor: 'var(--bg-card-alt)', borderColor: 'var(--border-subtle)' }}
                  >
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Export your local settings, chanting history, and meditation stats to move them to another device, or import a previously saved backup file.
                    </p>
                    <div className="flex gap-4">
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
                  </div>
                </section>

                {/* 1. Language & Script */}
                <section className="space-y-4">
                  <SectionLabel>{t('common.language')} & {t('common.script')}</SectionLabel>
                  <div className="grid grid-cols-2 gap-4">
                    <FieldGroup label={t('settings.language')}>
                      <StyledSelect
                        value={settings.language}
                        onChange={e => onUpdate({ ...settings, language: e.target.value })}
                      >
                        {(['en', 'vi', 'th', 'si', 'my', 'km', 'lo'] as const).map(lang => (
                          <option key={`lang-opt-${lang}`} value={lang}>{t(`settings.languages.${lang}`)}</option>
                        ))}
                      </StyledSelect>
                    </FieldGroup>
                    <FieldGroup label={t('settings.paliScript')}>
                      <StyledSelect
                        value={settings.paliScript}
                        onChange={e => onUpdate({ ...settings, paliScript: e.target.value as any })}
                      >
                        {(['roman', 'sinhala', 'burmese', 'thai', 'devanagari', 'lao', 'khmer', 'bengali', 'gurmukhi', 'gujarati', 'telugu', 'kannada', 'malayalam', 'taitham', 'brahmi', 'tibetan', 'cyrillic', 'assamese'] as const).map(s => (
                          <option key={`script-opt-${s}`} value={s}>{t(`settings.scripts.${s}`)}</option>
                        ))}
                      </StyledSelect>
                    </FieldGroup>
                  </div>
                </section>

                {/* 1.5 Font Size */}
                <section className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <SectionLabel>Font Size</SectionLabel>
                    <span className="text-sm font-bold opacity-60" style={{ color: 'var(--text-primary)' }}>
                      {settings.fontSize}px
                    </span>
                  </div>
                  <div className="px-1">
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
                      style={{ color: 'var(--accent)' }}
                    >
                      <span>Small</span>
                      <span>Normal</span>
                      <span>Large</span>
                    </div>
                  </div>
                </section>

                {/* 2. Location & Timezone */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <MapPin size="1em" style={{ color: 'var(--accent)' }} />
                      <SectionLabel inline>{t('settings.location')}</SectionLabel>
                    </div>
                    <button
                      className="text-sm font-bold hover:underline"
                      style={{ color: 'var(--accent)' }}
                      onClick={onGetLocation}
                    >
                      {t('settings.useCurrent')}
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Address search */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={t('settings.address')}
                        value={addressSearch}
                        onChange={e => setAddressSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        className="w-full pl-4 pr-12 py-4 rounded-2xl text-base focus:outline-none transition-all bg-transparent"
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
                        className="absolute right-2 top-2 bottom-2 px-3 rounded-xl text-white active:scale-95 transition-all"
                        style={{
                          backgroundColor: 'var(--accent)',
                          boxShadow: '0 4px 12px var(--accent-ring)',
                        }}
                      >
                        {isSearching ? <Loader2 size="1.2em" className="animate-spin" /> : <Search size="1.2em" />}
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
                          <p className="text-sm leading-tight font-medium" style={{ color: 'var(--text-secondary)' }}>
                            {settings.address}
                          </p>
                          <p className="text-sm mt-1 font-mono" style={{ color: 'var(--accent)' }}>
                            {settings.lat.toFixed(4)}°, {settings.lng.toFixed(4)}°
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* 3. Appearance */}
                <section className="space-y-4">
                  <SectionLabel>{t('common.appearance')}</SectionLabel>
                  <div className="flex flex-col gap-4 px-1">
                    <div className="flex justify-between items-center w-full">
                      <span className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
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
                      <span className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                        Dawn Alert
                      </span>
                      <Toggle
                        value={settings.dawnBell}
                        onToggle={() => onUpdate({ ...settings, dawnBell: !settings.dawnBell })}
                      />
                    </div>

                    <div className="flex justify-between items-center w-full">
                      <span className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                        {t('settings.iitStudent')}
                      </span>
                      <Toggle
                        value={settings.isIITStudent !== false}
                        onToggle={() => onUpdate({ ...settings, isIITStudent: settings.isIITStudent === false ? true : false })}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
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
                              "w-8 h-8 rounded-full transition-all",
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
                        className="px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all active:scale-95"
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

                {/* 4. Tradition & Calculation */}
                <section className="space-y-4 pb-4">
                  <SectionLabel>{t('settings.tradition')}</SectionLabel>
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
                                backgroundColor: 'transparent',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border-base)',
                              }
                        }
                      >
                        {type === 'srilanka' ? t('calendar.srilanka') : type}
                      </button>
                    ))}
                  </div>

                  <SectionLabel centered>{t('settings.dawnCalculation')}</SectionLabel>
                  <div className="flex flex-col gap-2">
                    {['astrology', 'offset'].map(m => (
                      <div key={`dawn-opt-wrap-${m}`} className="flex flex-col gap-2">
                        <button
                          key={`dawn-opt-${m}`}
                          onClick={() => onUpdate({ ...settings, dawnMethod: m })}
                          className="px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex justify-between items-center transition-all"
                          style={
                            settings.dawnMethod === m
                              ? {
                                  backgroundColor: 'var(--accent)',
                                  color: '#fff',
                                  border: '1px solid var(--accent)',
                                  boxShadow: '0 4px 16px var(--accent-ring)',
                                }
                              : {
                                  backgroundColor: 'transparent',
                                  color: 'var(--text-saffron)',
                                  border: '1px solid var(--border-base)',
                                }
                          }
                        >
                          <span>{t(`settings.dawnMethods.${m}`) !== `settings.dawnMethods.${m}` ? t(`settings.dawnMethods.${m}`) : m === 'offset' ? 'Time Shift' : 'Sun Angle'}</span>
                          {settings.dawnMethod === m && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </button>
                        
                        {settings.dawnMethod === m && m === 'astrology' && (
                          <div className="px-4 py-3 bg-[var(--bg-card-alt)] rounded-2xl flex flex-col gap-2 text-sm">
                            <span className="text-[var(--text-secondary)]">Angle: {settings.dawnAngle?.toFixed(2) ?? 9.0}°</span>
                            <div className="flex gap-2">
                              <input 
                                type="time" 
                                value={calibratingTime}
                                onChange={(e) => setCalibratingTime(e.target.value)}
                                className="flex-1 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-[var(--text-primary)]"
                              />
                              <button 
                                onClick={handleCalibrateDawn}
                                className="bg-[var(--accent)] text-white px-3 py-1 rounded-lg font-bold"
                              >
                                Calibrate
                              </button>
                            </div>
                            <span className="text-xs text-[var(--text-tertiary)] opacity-70">
                              Input today's dawn time to calibrate the angle. Preview: {(() => {
                                const stc = new SunTimesCalculator(settings.lat, settings.lng);
                                const previewDawn = stc.getDawn(new Date(), { ...settings, dawnMethod: 'astrology' });
                                return previewDawn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                              })()}
                            </span>
                          </div>
                        )}
                        
                        {settings.dawnMethod === m && m === 'offset' && (
                          <div className="px-4 py-3 bg-[var(--bg-card-alt)] rounded-2xl flex flex-col gap-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-[var(--text-secondary)]">Minutes before sunrise</span>
                              <input 
                                type="number" 
                                min={20}
                                max={50}
                                value={settings.dawnDurationOffset ?? 30}
                                onChange={(e) => onUpdate({ ...settings, dawnDurationOffset: Number(e.target.value) })}
                                className="w-16 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-center text-[var(--text-primary)]"
                              />
                            </div>
                            <span className="text-xs text-[var(--text-tertiary)] opacity-70">
                              Preview: {(() => {
                                const stc = new SunTimesCalculator(settings.lat, settings.lng);
                                const previewDawn = stc.getDawn(new Date(), { ...settings, dawnMethod: 'offset' });
                                return previewDawn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                              })()}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                {/* Legal & About */}
                <section className="space-y-4">
                  <SectionLabel>{t('settings.legal.title')}</SectionLabel>
                  <button
                    onClick={() => setShowLegal(true)}
                    className="w-full px-4 py-4 rounded-2xl text-sm font-bold flex items-center justify-between transition-all border"
                    style={{
                      backgroundColor: 'var(--bg-card-alt)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Info size={18} className="text-[var(--accent)]" />
                      <span>{t('settings.legal.button')}</span>
                    </div>
                    <div className="text-[var(--accent)]">→</div>
                  </button>
                </section>

                <button
                  onClick={onClose}
                  className="w-full py-4 rounded-3xl font-bold uppercase tracking-[0.2em] text-xs shadow-xl active:scale-[0.98] transition-all"
                  style={{
                    backgroundColor: 'var(--text-primary)',
                    color: 'var(--bg-main)',
                  }}
                >
                  {t('common.confirm')}
                </button>
        </div>
      </Modal>
      <LegalModal show={showLegal} onClose={() => setShowLegal(false)} />
    </>
  );
}

// ── Small helpers ────────────────────────────────────────────────────────────

function SectionLabel({ children, inline, centered }: { children: React.ReactNode; inline?: boolean; centered?: boolean }) {
  return (
    <h3
      className={cn(
        "text-sm font-black uppercase tracking-widest",
        !inline && "px-1",
        centered && "text-center pt-2",
      )}
      style={{ color: 'var(--accent)' }}
    >
      {children}
    </h3>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label
        className="text-sm font-bold uppercase ml-1 block"
        style={{ color: 'var(--accent)' }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function StyledSelect({ value, onChange, children }: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none appearance-none"
      style={{
        backgroundColor: 'var(--bg-input)',
        border: '1px solid var(--border-base)',
        color: 'var(--text-primary)',
      }}
    >
      {children}
    </select>
  );
}