import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDynamicTheme } from '../hooks/useDynamicTheme';

// ─── Tipi ─────────────────────────────────────────────────────────────────────
export type ThemeMode = 'light' | 'dark' | 'weather';

export type ThemeColors = {
  // Sfondi
  bg: string;
  card: string;
  cardSecondary: string;
  // Testo
  text: string;
  textSub: string;
  textMuted: string;
  // Brand
  primary: string;
  primaryDark: string;
  primaryLight: string;
  // UI
  border: string;
  appBar: string;
  tabBar: string;
  tabIconActive: string;
  tabIconInactive: string;
  tabLabelActive: string;
  pillActive: string;
  // Sistema
  statusBar: 'dark-content' | 'light-content';
  isDark: boolean;
  // Meteo (opzionale)
  gradient?: readonly [string, string, ...string[]];
  weatherIcon?: string;
  weatherLabel?: string;
};

// ─── Tema Chiaro ──────────────────────────────────────────────────────────────
const LIGHT: ThemeColors = {
  bg:             '#F3F4F6',
  card:           '#FFFFFF',
  cardSecondary:  '#F8FAFC',
  text:           '#1E293B',
  textSub:        '#64748B',
  textMuted:      '#94A3B8',
  primary:        '#2563EB',
  primaryDark:    '#1E3A8A',
  primaryLight:   '#DBEAFE',
  border:         '#E5E7EB',
  appBar:         '#FFFFFF',
  tabBar:         '#FFFFFF',
  tabIconActive:  '#FFFFFF',
  tabIconInactive:'#94A3B8',
  tabLabelActive: '#2563EB',
  pillActive:     '#2563EB',
  statusBar:      'dark-content',
  isDark:         false,
};

// ─── Tema Scuro ───────────────────────────────────────────────────────────────
const DARK: ThemeColors = {
  bg:             '#0F172A',
  card:           '#1E293B',
  cardSecondary:  '#0F172A',
  text:           '#F1F5F9',
  textSub:        '#94A3B8',
  textMuted:      '#475569',
  primary:        '#3B82F6',
  primaryDark:    '#93C5FD',
  primaryLight:   '#1E3A5F',
  border:         '#334155',
  appBar:         '#1E293B',
  tabBar:         '#1E293B',
  tabIconActive:  '#FFFFFF',
  tabIconInactive:'#475569',
  tabLabelActive: '#60A5FA',
  pillActive:     '#3B82F6',
  statusBar:      'light-content',
  isDark:         true,
};

// ─── Paletta meteo → colori flat per UI ──────────────────────────────────────
function weatherToColors(gradient: readonly [string, string, ...string[]], icon: string, desc: string): ThemeColors {
  const dominant = gradient[0];
  return {
    bg:             dominant,
    card:           'transparent',
    cardSecondary:  'transparent',
    text:           '#E8F4FD',
    textSub:        '#A8C5E8',
    textMuted:      '#7BA3CA',
    primary:        '#136DEC',
    primaryDark:    '#93C5FD',
    primaryLight:   'rgba(255,255,255,0.12)',
    border:         'rgba(255,255,255,0.15)',
    appBar:         dominant,
    tabBar:         gradient[gradient.length - 1],
    tabIconActive:  '#FFFFFF',
    tabIconInactive:'rgba(255,255,255,0.45)',
    tabLabelActive: '#FFFFFF',
    pillActive:     'rgba(255,255,255,0.25)',
    statusBar:      'light-content',
    isDark:         true,
    gradient,
    weatherIcon:    icon,
    weatherLabel:   desc,
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────
type ThemeContextValue = {
  mode:      ThemeMode;
  colors:    ThemeColors;
  setMode:   (m: ThemeMode) => void;
  isLoading: boolean;
};

const ThemeContext = createContext<ThemeContextValue>({
  mode:      'light',
  colors:    LIGHT,
  setMode:   () => {},
  isLoading: false,
});

const STORAGE_KEY = 'aerostaff_theme_mode';

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [ready, setReady] = useState(false);
  const { theme: weatherTheme, loadingTheme } = useDynamicTheme();

  // Carica preferenza salvata
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(v => {
      if (v === 'light' || v === 'dark' || v === 'weather') setModeState(v);
      setReady(true);
    });
  }, []);

  const setMode = useCallback(async (m: ThemeMode) => {
    setModeState(m);
    await AsyncStorage.setItem(STORAGE_KEY, m);
  }, []);

  // Calcola colori attivi
  let colors: ThemeColors = LIGHT;
  if (mode === 'dark') {
    colors = DARK;
  } else if (mode === 'weather') {
    colors = weatherToColors(weatherTheme.background, weatherTheme.icon, weatherTheme.description);
  }

  const isLoading = !ready || (mode === 'weather' && loadingTheme);

  return (
    <ThemeContext.Provider value={{ mode, colors, setMode, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAppTheme() {
  return useContext(ThemeContext);
}
