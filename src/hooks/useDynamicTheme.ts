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

// Variabile globale per mantenere in memoria il tema anche cambiando scheda
let globalCachedTheme: Theme | null = null;
let isFetchingTheme = false;

export function useDynamicTheme() {
  const [theme, setTheme] = useState<Theme>(globalCachedTheme || themes.default);
  const [loading, setLoading] = useState(!globalCachedTheme);

  useEffect(() => {
    let isMounted = true;

    async function fetchTheme() {
      if (globalCachedTheme) return; // Se già calcolato, evita ricaricamenti nulli
      if (isFetchingTheme) return; 
      isFetchingTheme = true;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
           if (isMounted) setTheme(themes.default);
           return;
        }

        // Reduced accuracy massively speeds up GPS locks indoors!
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const lat = location.coords.latitude;
        const lon = location.coords.longitude;

        // Fetch meteo mondiale gratuito e senza chiavi (Open-Meteo)
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const data = await response.json();
        
        const weatherCode = data.current_weather.weathercode;
        const isDay = data.current_weather.is_day; // 1 se giorno, 0 se notte

        // Orario locale per distinguere mattina/pomeriggio/sera
        const hour = new Date().getHours();
        
        let timePeriod = 'night';
        if (hour >= 6 && hour < 12) timePeriod = 'morning';
        else if (hour >= 12 && hour < 18) timePeriod = 'afternoon';
        else if (hour >= 18 && hour < 20) timePeriod = 'evening';

        // Categorizzazione WMO meteorologica
        let weatherType = 'clear';
        if (weatherCode === 3) weatherType = 'cloudy';
        else if (weatherCode >= 45 && weatherCode <= 67) weatherType = 'rain';
        else if (weatherCode >= 80) weatherType = 'rain'; 

        let selectedTheme = themes.default;
        
        // Logica prioritaria di fusione (Il meteo "brutto" sovrascrive il sole, altrimenti decide l'ora)
        if (weatherType === 'cloudy') {
            selectedTheme = themes.cloudy;
        } else if (weatherType === 'rain') {
            selectedTheme = themes.rain;
        } else {
           if (!isDay || timePeriod === 'night') selectedTheme = themes.night_clear;
           else if (timePeriod === 'morning') selectedTheme = themes.morning_clear;
           else if (timePeriod === 'afternoon') selectedTheme = themes.afternoon_clear;
           else if (timePeriod === 'evening') selectedTheme = themes.evening_clear;
        }

        globalCachedTheme = selectedTheme;
        if (isMounted) setTheme(selectedTheme);
      } catch (err) {
        console.warn("Errore caricamento tema dinamico:", err);
      } finally {
        if (isMounted) setLoading(false);
        isFetchingTheme = false;
      }
    }

    fetchTheme();
    return () => { isMounted = false; };
  }, []);

  return { theme, loadingTheme: loading };
}
