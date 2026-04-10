import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  translations, MONTHS, WEEKDAYS_SHORT, WEEKDAYS_LONG, LOCALE_MAP, LANGUAGES, WEATHER_MAP,
  type Lang, type TranslationKey,
} from '../i18n/translations';

const STORAGE_KEY = 'aerostaff_language_v1';

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => Promise<void>;
  t: (key: TranslationKey) => string;
  months: string[];
  weekDaysShort: string[];
  weekDaysLong: string[];
  locale: string;
  weatherMap: Record<number, { text: string; icon: string }>;
  languages: typeof LANGUAGES;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('it');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(stored => {
      if (stored === 'it' || stored === 'en') setLangState(stored as Lang);
    });
  }, []);

  const setLang = useCallback(async (next: Lang) => {
    setLangState(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string =>
      (translations[lang] as Record<string, string>)[key] ??
      (translations.it as Record<string, string>)[key] ??
      key,
    [lang]
  );

  const value: LanguageContextValue = {
    lang, setLang, t,
    months: MONTHS[lang],
    weekDaysShort: WEEKDAYS_SHORT[lang],
    weekDaysLong: WEEKDAYS_LONG[lang],
    locale: LOCALE_MAP[lang],
    weatherMap: WEATHER_MAP[lang],
    languages: LANGUAGES,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
