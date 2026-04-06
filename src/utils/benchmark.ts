import { autoScheduleNotifications } from './autoNotifications';
import * as Calendar from 'expo-calendar';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as fr24api from './fr24api';

// Mock dependencies
jest.mock('expo-calendar', () => ({
  requestCalendarPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCalendarsAsync: jest.fn().mockResolvedValue([{ id: 'cal1', allowsModifications: true, isPrimary: true }]),
  getEventsAsync: jest.fn().mockResolvedValue([{ title: 'Lavoro', startDate: new Date(Date.now() - 3600000), endDate: new Date(Date.now() + 3600000) }]),
  EntityTypes: { EVENT: 'EVENT' }
}));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  scheduleNotificationAsync: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('notif_id'), 10))),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'time_interval' }
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockImplementation((key) => {
    if (key === 'aerostaff_notif_last_schedule') return Promise.resolve('2000-01-01');
    return Promise.resolve(null);
  }),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined)
}));

const mockDepartures = Array(50).fill(null).map((_, i) => ({
  flight: {
    time: { scheduled: { departure: Math.floor(Date.now() / 1000) + 1800 + i * 60 } },
    airline: { name: 'Test Airline' },
    identification: { number: { default: `TEST${i}` } },
    airport: { destination: { name: 'Test Airport' } }
  }
}));

const mockArrivals = Array(50).fill(null).map((_, i) => ({
  flight: {
    time: { scheduled: { arrival: Math.floor(Date.now() / 1000) + 1800 + i * 60 } },
    airline: { name: 'Test Airline' },
    identification: { number: { default: `TESTA${i}` } },
    airport: { origin: { name: 'Test Origin' } }
  }
}));

jest.mock('./fr24api', () => ({
  fetchAirportScheduleRaw: jest.fn().mockResolvedValue({ departures: mockDepartures, arrivals: mockArrivals })
}));

async function runBenchmark() {
  console.log('Starting benchmark...');
  const start = Date.now();
  const count = await autoScheduleNotifications();
  const end = Date.now();
  console.log(`Scheduled ${count} notifications in ${end - start}ms`);
}

runBenchmark().catch(console.error);
