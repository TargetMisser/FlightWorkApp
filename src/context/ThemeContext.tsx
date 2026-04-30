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
  // Glass tokens
  glass: string;
  glassBorder: string;
  glassStrong: string;
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
  bg:             '#F2F2F7',
  card:           '#FFFFFF',
  cardSecondary:  '#F2F2F7',
  text:           '#1C1C1E',
  textSub:        '#48484A',
  textMuted:      'rgba(60,60,67,0.45)',
  primary:        '#F47B16',
  primaryDark:    '#C2520A',
  primaryLight:   '#FFEDD5',
  glass:          '#FFFFFF',
  glassBorder:    'transparent',
  glassStrong:    '#FFFFFF',
  border:         'rgba(60,60,67,0.12)',
  appBar:         'rgba(242,242,247,0.85)',
  tabBar:         'rgba(255,255,255,0.90)',
  tabIconActive:  '#F47B16',
  tabIconInactive:'rgba(60,60,67,0.38)',
  tabLabelActive: '#F47B16',
  pillActive:     'rgba(244,123,22,0.14)',
  statusBar:      'dark-content',
  isDark:         false,
};

// ─── Tema Scuro ───────────────────────────────────────────────────────────────
const DARK: ThemeColors = {
  bg:             '#0A0A0C',
  card:           '#1C1C1E',
  cardSecondary:  '#2C2C2E',
  text:           '#FFFFFF',
  textSub:        'rgba(235,235,245,0.75)',
  textMuted:      'rgba(235,235,245,0.38)',
  primary:        '#FF9A42',
  primaryDark:    '#F47B16',
  primaryLight:   'rgba(255,154,66,0.20)',
  glass:          '#1C1C1E',
  glassBorder:    'transparent',
  glassStrong:    '#2C2C2E',
  border:         'rgba(255,255,255,0.11)',
  appBar:         '#0A0A0C',
  tabBar:         '#111113',
  tabIconActive:  '#FF9A42',
  tabIconInactive:'rgba(235,235,245,0.35)',
  tabLabelActive: '#FF9A42',
  pillActive:     'rgba(255,154,66,0.18)',
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
    text:           '#FFFFFF',
    textSub:        'rgba(235,235,245,0.75)',
    textMuted:      'rgba(235,235,245,0.45)',
    primary:        '#FF9A42',
    primaryDark:    '#F47B16',
    primaryLight:   'rgba(255,154,66,0.20)',
    glass:          'rgba(255,255,255,0.15)',
    glassBorder:    'rgba(255,255,255,0.25)',
    glassStrong:    'rgba(255,255,255,0.22)',
    border:         'rgba(255,255,255,0.15)',
    appBar:         dominant,
    tabBar:         gradient[gradient.length - 1],
    tabIconActive:  '#FF9A42',
    tabIconInactive:'rgba(255,255,255,0.45)',
    tabLabelActive: '#FFFFFF',
    pillActive:     'rgba(255,255,255,0.30)',
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
