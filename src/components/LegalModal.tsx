import React from 'react';
import { ExternalLink, Shield, FileText, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { useI18n } from '../hooks/useI18n';
import { Modal } from './Modal';

export function LegalModal({ show, onClose }: { show: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const [section, setSection] = React.useState<'privacy' | 'eula' | 'about'>('about');

  const sections = [
    { id: 'about', label: t('settings.legal.about'), icon: Info },
    { id: 'privacy', label: t('settings.legal.privacy'), icon: Shield },
    { id: 'eula', label: t('settings.legal.eula'), icon: FileText },
  ] as const;

  return (
    <Modal
      show={show}
      onClose={onClose}
      title={t('settings.legal.title')}
      maxWidth="xl"
    >

            {/* Tabs */}
            <div className="flex gap-2 mb-6 bg-black/5 dark:bg-white/5 p-1 rounded-2xl">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                    section === s.id 
                      ? "bg-white dark:bg-slate-800 shadow-sm shadow-black/10 text-[var(--accent)]" 
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  )}
                >
                  <s.icon size={14} />
                  {s.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide pr-2 space-y-6 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {section === 'about' && (
                <div className="space-y-6">
                  <section>
                    <h3 className="font-bold text-base mb-2" style={{ color: 'var(--text-primary)' }}>IIT Calendar</h3>
                    <p>
                      A comprehensive Dhamma tool providing Buddhist calendars, chanting resources, and meditation aids. 
                      This application is open-source and intended for personal practice and study.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-bold text-base mb-2" style={{ color: 'var(--text-primary)' }}>Attributions</h3>
                    <ul className="space-y-4">
                      <li className="flex flex-col gap-1">
                        <span className="font-bold">Pali Script Converter & Fonts</span>
                        <span>Provided by <a href="https://tipitaka.lk" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] inline-flex items-center gap-1 hover:underline">tipitaka.lk <ExternalLink size={12}/></a></span>
                      </li>
                      <li className="flex flex-col gap-1">
                        <span className="font-bold">Buddhist Calendar & Chanting Logic</span>
                        <span>Derived from <a href="https://buddhist-era.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] inline-flex items-center gap-1 hover:underline">Buddhist Era <ExternalLink size={12}/></a></span>
                      </li>
                      <li className="flex flex-col gap-1">
                        <span className="font-bold">Pomodoro Timer Design</span>
                        <span>Inspired by <a href="https://pomofocus.io" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] inline-flex items-center gap-1 hover:underline">Pomofocus <ExternalLink size={12}/></a></span>
                      </li>
                    </ul>
                  </section>

                  <section className="pt-4 border-t border-black/5 dark:border-white/5">
                    <p className="text-xs opacity-60 italic">
                      All Dhamma content is provided for free as a Dhammadana.
                    </p>
                  </section>
                </div>
              )}

              {section === 'privacy' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Privacy Policy</h3>
                  <p>This Privacy Policy describes how your personal information is handled in IIT Calendar.</p>
                  
                  <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>1. Data Storage</h4>
                  <p>
                    IIT Calendar is a "local-first" application. All your data, including settings, chanting history, 
                    and meditation statistics, is stored exclusively on your device using local storage or native file systems.
                  </p>

                  <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>2. No Data Collection</h4>
                  <p>
                    We do not collect, store, or transmit any personal data to external servers. There are no analytics 
                    or tracking scripts embedded in the application.
                  </p>

                  <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>3. Location Data</h4>
                  <p>
                    The app requests location access to calculate accurate solar events (dawn, noon, sunset) and lunar 
                    dates based on your current coordinates. This data is used only for calculations within the app 
                    and is not shared with anyone.
                  </p>

                  <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>4. Backups</h4>
                  <p>
                    When you use the "Export" feature, a file is generated on your device. You are responsible for 
                    the security of your backup files.
                  </p>
                </div>
              )}

              {section === 'eula' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>End User License Agreement</h3>
                  
                  <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>1. Acceptance of Terms</h4>
                  <p>By using this application, you agree to the terms of this agreement.</p>

                  <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>2. License</h4>
                  <p>
                    This software is open-source. You may use it for personal, non-commercial purposes in accordance 
                    with its open-source license.
                  </p>

                  <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>3. Disclaimer of Warranty</h4>
                  <p>
                    The application is provided "AS IS", without warranty of any kind, express or implied, including 
                    but not limited to the warranties of merchantability, fitness for a particular purpose and 
                    non-infringement.
                  </p>

                  <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>4. Limitation of Liability</h4>
                  <p>
                    In no event shall the authors or copyright holders be liable for any claim, damages or other 
                    liability, whether in an action of contract, tort or otherwise, arising from, out of or in 
                    connection with the software or the use or other dealings in the software.
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full mt-6 py-4 rounded-3xl font-bold uppercase tracking-[0.2em] text-xs active:scale-[0.98] transition-all"
              style={{
                backgroundColor: 'var(--text-primary)',
                color: 'var(--bg-main)',
              }}
            >
              Close
            </button>
    </Modal>
  );
}
