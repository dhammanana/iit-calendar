import React from 'react';
import { ExternalLink, Shield, FileText, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { useI18n } from '../hooks/useI18n';
import { Modal } from './Modal';
import { SegmentedControl } from './SegmentedControl';

export function LegalModal({ show, onClose }: { show: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const [section, setSection] = React.useState<'about' | 'privacy' | 'eula'>('about');

  return (
    <Modal
      show={show}
      onClose={onClose}
      title={t('settings.legal.title')}
      maxWidth="xl"
      className="h-[calc(100vh-3rem)] max-h-[calc(100vh-3rem)] sm:h-[88vh] sm:max-h-[88vh]"
    >

      {/* Tabs */}
      <div className="shrink-0 mb-4 flex justify-center">
        <SegmentedControl
          options={[
            { id: 'about', label: t('settings.legal.about') || 'About', icon: Info },
            { id: 'privacy', label: t('settings.legal.privacy') || 'Privacy Policy', icon: Shield },
            { id: 'eula', label: t('settings.legal.eula') || 'Terms', icon: FileText },
          ]}
          value={section}
          onChange={(val) => setSection(val as any)}
          className="w-full"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide pr-2 space-y-6 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {section === 'about' && (
          <div className="space-y-6">
            <section className="space-y-3">
              <h3 className="font-bold text-base mb-2" style={{ color: 'var(--text-primary)' }}>
                {t('settings.legal.aboutTitle') || 'About IIT Calendar'}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {t('settings.legal.aboutP1') || 'IIT Calendar has been developed as an effort to support the Dhamma community, with the kind guidance, advice, and encouragement of Ven. Werapitiye Devananda Thera.'}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {t('settings.legal.aboutP2') || 'This application is dedicated to all members of the Sangha and devotees who strive to preserve, practise, and share the Dhamma.'}
              </p>
              <p className="text-sm leading-relaxed text-[var(--text-tertiary)] pt-1">
                The source code and content are freely available on{' '}
                <a
                  href="https://github.com/iitsldev/iit-calendar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] font-semibold inline-flex items-center gap-0.5 hover:underline"
                >
                  GitHub <ExternalLink size={11} className="inline" />
                </a>{' '}
                for anyone to use, share, and adapt for non-commercial purposes.
              </p>
            </section>

            <section className="pt-4 border-t border-black/5 dark:border-white/5 space-y-3">
              <h3 className="font-bold text-base mb-2" style={{ color: 'var(--text-primary)' }}>Attributions</h3>
              <ul className="space-y-4">
                <li className="flex flex-col gap-1">
                  <span className="font-bold">Pali Script Converter & Fonts</span>
                  <span>Provided by <a href="https://tipitaka.lk" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] inline-flex items-center gap-1 hover:underline">tipitaka.lk <ExternalLink size={12} /></a></span>
                </li>
                <li className="flex flex-col gap-1">
                  <span className="font-bold">Buddhist Calendar & Chanting Logic</span>
                  <span>Derived from <a href="https://buddhist-era.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] inline-flex items-center gap-1 hover:underline">Buddhist Era <ExternalLink size={12} /></a></span>
                </li>
                <li className="flex flex-col gap-1">
                  <span className="font-bold">Pomodoro Timer Design</span>
                  <span>Inspired by <a href="https://pomofocus.io" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] inline-flex items-center gap-1 hover:underline">Pomofocus <ExternalLink size={12} /></a></span>
                </li>
              </ul>
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
    </Modal>
  );
}
