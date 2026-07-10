/**
 * Internationalization (Spanish / English).
 *
 * Usage:
 *   const { t, lang, setLang } = useI18n();
 *   t('client.greeting', { name: 'Enrique' })
 *
 * `t` resolves dotted keys against the active dictionary and interpolates
 * {placeholders}. Missing keys return the key itself (visible in dev, harmless
 * in prod) rather than throwing.
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import es from '../locales/es';
import en from '../locales/en';

const DICTIONARIES = { es, en };
const STORAGE_KEY = 'detailgo.lang';
const SUPPORTED = ['es', 'en'];
const FALLBACK = 'es';

const I18nContext = createContext(null);

const resolve = (dict, key) =>
  key.split('.').reduce((acc, part) => (acc == null ? acc : acc[part]), dict);

const interpolate = (template, vars) =>
  typeof template === 'string' && vars
    ? template.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`))
    : template;

const deviceLang = () => {
  try {
    const code = getLocales?.()?.[0]?.languageCode;
    return SUPPORTED.includes(code) ? code : FALLBACK;
  } catch {
    return FALLBACK;
  }
};

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(deviceLang());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved && SUPPORTED.includes(saved)) setLangState(saved);
      })
      .catch(() => {});
  }, []);

  const setLang = useCallback((next) => {
    if (!SUPPORTED.includes(next)) return;
    setLangState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const t = useCallback(
    (key, vars) => {
      const dict = DICTIONARIES[lang] || DICTIONARIES[FALLBACK];
      const value = resolve(dict, key) ?? resolve(DICTIONARIES[FALLBACK], key);
      return value == null ? key : interpolate(value, vars);
    },
    [lang]
  );

  const value = useMemo(() => ({ t, lang, setLang }), [t, lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
};

export default I18nContext;
