import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

type Theme = {
  background: readonly [string, string, ...string[]];
  cardBackground: string;
  textColor: string;
  primaryButton: string;
  icon: string;
  description: string;
};

// Mappatura temi visuali premium (Stitch Design System: #136DEC, Dark, Inter, Round 8)
const themes: Record<string, Theme> = {
  morning_clear: {
    background: ['#1a2a4a', '#136dec'],
    cardBackground: 'rgba(255, 255, 255, 0.12)',
    textColor: '#e8f4fd',
    primaryButton: '#136DEC',
    icon: '🌤️',
    description: 'Mattina Soleggiata',
  },
  afternoon_clear: {
    background: ['#0d1b3e', '#136dec', '#1a8fe0'],
    cardBackground: 'rgba(255, 255, 255, 0.10)',
    textColor: '#e8f4fd',
    primaryButton: '#136DEC',
    icon: '☀️',
    description: 'Pomeriggio Sereno',
  },
  evening_clear: {
    background: ['#0d1b3e', '#1a1a2e', '#16213e'],
    cardBackground: 'rgba(19, 109, 236, 0.18)',
    textColor: '#ecf0f1',
    primaryButton: '#136DEC',
    icon: '🌅',
    description: 'Tramonto',
  },
  night_clear: {
    background: ['#060d1f', '#0d1b3e', '#0a1628'],
    cardBackground: 'rgba(19, 109, 236, 0.15)',
    textColor: '#cfd8e3',
    primaryButton: '#136DEC',
    icon: '🌙',
    description: 'Notte Serena',
  },
  cloudy: {
    background: ['#1a1a2e', '#2c3e50'],
    cardBackground: 'rgba(255, 255, 255, 0.08)',
    textColor: '#b2bec3',
    primaryButton: '#136DEC',
    icon: '☁️',
    description: 'Nuvoloso',
  },
  rain: {
    background: ['#0d1b3e', '#0a2342', '#051025'],
    cardBackground: 'rgba(19, 109, 236, 0.12)',
    textColor: '#a8c5e8',
    primaryButton: '#136DEC',
    icon: '🌧️',
    description: 'Pioggia',
  },
  default: {
    background: ['#0d1b3e', '#136dec'],
    cardBackground: 'rgba(255, 255, 255, 0.10)',
    textColor: '#e8f4fd',
    primaryButton: '#136DEC',
    icon: '✨',
    description: 'Tema Standard',
  }
};

// Global cache — shared across all consumers so the fetch runs only once.
// A Promise is stored while a fetch is in-flight so late subscribers can await
// the same result instead of triggering a duplicate request (fixes race condition).
let globalCachedTheme: Theme | null = null;
let pendingFetch: Promise<Theme> | null = null;

async function resolveTheme(): Promise<Theme> {
  if (globalCachedTheme) return globalCachedTheme;
  if (pendingFetch) return pendingFetch;

  pendingFetch = (async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return themes.default;

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lon } = location.coords;

      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`,
      );
      const data = await response.json();

      const weatherCode: number = data.current_weather?.weathercode ?? 0;
      const isDay: number = data.current_weather?.is_day ?? 1;
      const hour = new Date().getHours();

      let timePeriod = 'night';
      if (hour >= 6 && hour < 12) timePeriod = 'morning';
      else if (hour >= 12 && hour < 18) timePeriod = 'afternoon';
      else if (hour >= 18 && hour < 20) timePeriod = 'evening';

      let weatherType = 'clear';
      if (weatherCode === 3) weatherType = 'cloudy';
      else if (weatherCode >= 45 && weatherCode <= 67) weatherType = 'rain';
      else if (weatherCode >= 80) weatherType = 'rain';

      let selected = themes.default;
      if (weatherType === 'cloudy') selected = themes.cloudy;
      else if (weatherType === 'rain') selected = themes.rain;
      else if (!isDay || timePeriod === 'night') selected = themes.night_clear;
      else if (timePeriod === 'morning') selected = themes.morning_clear;
      else if (timePeriod === 'afternoon') selected = themes.afternoon_clear;
      else if (timePeriod === 'evening') selected = themes.evening_clear;

      globalCachedTheme = selected;
      return selected;
    } catch (err) {
      console.warn('Errore caricamento tema dinamico:', err);
      return themes.default;
    } finally {
      pendingFetch = null;
    }
  })();

  return pendingFetch;
}

export function useDynamicTheme() {
  const [theme, setTheme] = useState<Theme>(globalCachedTheme || themes.default);
  const [loading, setLoading] = useState(!globalCachedTheme);

  useEffect(() => {
    let cancelled = false;
    resolveTheme().then(t => {
      if (!cancelled) {
        setTheme(t);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  return { theme, loadingTheme: loading };
}
