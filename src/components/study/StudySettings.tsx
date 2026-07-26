import React from 'react';
import { Clock, CheckSquare } from 'lucide-react';
import { useI18n } from '../../hooks/useI18n';
import { Toggle } from '../Toggle';
import { Modal } from '../Modal';
import { LabeledSelect } from '../LabeledSelect';

export interface StudySettingsData {
  pomodoro: number;
  shortBreak: number;
  longBreak: number;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  longBreakInterval: number;
  autoCheckTasks: boolean;
  checkToBottom: boolean;
}

interface Props {
  show: boolean;
  onClose: () => void;
  settings: StudySettingsData;
  onUpdate: (settings: StudySettingsData) => void;
  inline?: boolean;
}

export function StudySettings({ show, onClose, settings, onUpdate, inline }: Props) {
  const { t } = useI18n();

  const handleChange = (key: keyof StudySettingsData, value: any) => {
    onUpdate({ ...settings, [key]: value });
  };

  const handleTimeChange = (key: 'pomodoro' | 'shortBreak' | 'longBreak', valueStr: string) => {
    const val = parseInt(valueStr);
    if (!isNaN(val) && val > 0) handleChange(key, val * 60);
  };

  const content = (
    <div className="grid grid-cols-1 gap-4">

      {/* Timer durations card */}
      <div
        className="rounded-[2rem] p-6 relative overflow-hidden"
        style={{ backgroundColor: 'var(--sm-card-bg)', border: '1px solid var(--sm-border)' }}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-serif text-xl" style={{ color: 'var(--sm-text-primary)' }}>
            {t('study.timer') || 'Timer'}
          </h3>
          <Clock size={20} style={{ color: 'var(--sm-text-muted)' }} />
        </div>

        <div className="space-y-6">
          {/* Pomodoro / Short Break / Long Break selectors */}
          {([
            { key: 'pomodoro', label: t('study.pomodoro') || 'Pomodoro' },
            { key: 'shortBreak', label: t('study.shortBreak') || 'Short Break' },
            { key: 'longBreak', label: t('study.longBreak') || 'Long Break' },
          ] as { key: 'pomodoro' | 'shortBreak' | 'longBreak'; label: string }[]).map(({ key, label }) => (
            <LabeledSelect
              key={key}
              label={label}
              value={Math.floor(settings[key] / 60)}
              onChange={(val) => handleTimeChange(key, val)}
              options={Array.from({ length: 60 }, (_, i) => i + 1).map(m => ({
                value: m,
                label: m.toString().padStart(2, '0')
              }))}
              badgeLabel="minutes"
            />
          ))}

          {/* Long break interval */}
          <LabeledSelect
            label={t('study.longBreakInterval') || 'Long Break Every'}
            value={settings.longBreakInterval}
            onChange={(val) => handleChange('longBreakInterval', Math.max(1, parseInt(val) || 1))}
            options={[2, 3, 4, 5, 6, 7, 8].map(n => ({
              value: n,
              label: n
            }))}
            badgeLabel="pomodoros"
          />

          {/* Auto-start toggles */}
          {([
            { key: 'autoStartBreaks', label: t('study.autoStartBreaks') || 'Auto Start Breaks' },
            { key: 'autoStartPomodoros', label: t('study.autoStartPomodoros') || 'Auto Start Pomodoros' },
          ] as { key: keyof StudySettingsData; label: string }[]).map(({ key, label }) => (
            <div key={String(key)} className="flex items-center justify-between py-1">
              <span className="text-sm font-bold" style={{ color: 'var(--sm-text-primary)' }}>{label}</span>
              <Toggle checked={!!settings[key]} onChange={(val) => handleChange(key, val)} />
            </div>
          ))}
        </div>
      </div>

      {/* Task behaviour card */}
      <div
        className="rounded-[2rem] p-6 relative overflow-hidden"
        style={{ backgroundColor: 'var(--sm-card-bg)', border: '1px solid var(--sm-border)' }}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-serif text-xl" style={{ color: 'var(--sm-text-primary)' }}>
            {t('study.task') || 'Tasks'}
          </h3>
          <CheckSquare size={20} style={{ color: 'var(--sm-text-muted)' }} />
        </div>

        <div className="space-y-4">
          {([
            { key: 'autoCheckTasks', label: t('study.autoCheckTasks') || 'Auto Check Tasks' },
            { key: 'checkToBottom', label: t('study.checkToBottom') || 'Move Completed to Bottom' },
          ] as { key: keyof StudySettingsData; label: string }[]).map(({ key, label }) => (
            <div key={String(key)} className="flex items-center justify-between py-1">
              <span className="text-sm font-bold" style={{ color: 'var(--sm-text-primary)' }}>{label}</span>
              <Toggle checked={!!settings[key]} onChange={(val) => handleChange(key, val)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      show={show}
      onClose={onClose}
      title={t('study.settings') || 'Settings'}
      maxWidth="sm"
      inline={inline}
    >
      {content}
    </Modal>
  );
}

