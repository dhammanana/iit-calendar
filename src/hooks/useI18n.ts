import { useState, useEffect, useCallback } from 'react';
import en from '../i18n/en.json';
import vi from '../i18n/vi.json';
import th from '../i18n/th.json';
import si from '../i18n/si.json';
import my from '../i18n/my.json';
import km from '../i18n/km.json';
import lo from '../i18n/lo.json';

const translations: Record<string, any> = {
  en, vi, th, si, my, km, lo
};

export const useI18n = () => {
  const [lang, setLang] = useState('en');

  useEffect(() => {
    const checkLang = () => {
      const saved = localStorage.getItem('iit_settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.language && parsed.language !== lang) {
            setLang(parsed.language);
          }
        } catch(e) {}
      }
    };
    
    checkLang();
    
    // Poll for changes in case it's updated in the same window without a storage event
    const interval = setInterval(checkLang, 500);
    window.addEventListener('storage', checkLang);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkLang);
    };
  }, [lang]);

  const t = useCallback((path: string, params?: Record<string, any>) => {
    const dict = translations[lang] || en;
    let result = path.split('.').reduce((obj, key) => obj?.[key], dict) ?? path.split('.').reduce((obj, key) => obj?.[key], en);
    if (!result) return undefined;
    
    if (params && typeof result === 'string') {
      Object.entries(params).forEach(([key, value]) => {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      });
    }
    
    return result;
  }, [lang]);

  /** Resolve a translation key for an explicit language (ignores active UI lang). Falls back to English. */
  const tFor = useCallback((targetLang: string, path: string): string => {
    const dict = translations[targetLang] || en;
    return path.split('.').reduce((obj: any, key) => obj?.[key], dict)
      || path.split('.').reduce((obj: any, key) => obj?.[key], en)
      || path;
  }, []); // stable — translations is a module-level constant

  return { t, tFor, language: lang };
};
