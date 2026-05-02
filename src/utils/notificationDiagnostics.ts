import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

export const NOTIF_IDS_KEY = 'aerostaff_notif_ids_v1';
export const NOTIF_ENABLED_KEY = 'aerostaff_notif_enabled';
export const NOTIF_SETTINGS_KEY = 'aerostaff_notif_settings_v1';
export const PINNED_NOTIF_IDS_KEY = 'pinned_notif_ids_v1';
export const LAST_SCHEDULE_KEY = 'aerostaff_notif_last_schedule';

const DEBUG_EVENTS_KEY = 'aerostaff_notif_debug_v1';
const MAX_DEBUG_EVENTS = 40;

const KNOWN_SHIFT_TYPES = new Set([
  'arrival_10min',
  'arrival_shift',
  'checkin_open_10min',
  'checkin_close_10min',
  'departure_shift',
  'gate_open_5min',
  'gate_close_5min',
  'shift_end',
]);

type NotificationData = Record<string, unknown>;

export type NotificationDebugSource = 'auto' | 'flights' | 'pinned' | 'settings';

export type NotificationDebugEvent = {
  at: number;
  source: NotificationDebugSource;
  type: string;
  message: string;
  scheduled?: number;
  cancelled?: number;
  pending?: number;
  meta?: Record<string, unknown>;
};

export type NotificationDuplicateGroup = {
  key: string;
  count: number;
  titles: string[];
};

export type NotificationDebugSnapshot = {
  enabled: boolean;
  savedShiftIds: number;
  savedPinnedIds: number;
  pendingTotal: number;
  pendingAeroStaff: number;
  pendingShift: number;
  pendingPinned: number;
  possibleDuplicates: NotificationDuplicateGroup[];
  lastScheduleDay: string | null;
  lastEvents: NotificationDebugEvent[];
};

export type NotificationCancelScope = {
  includeShift: boolean;
  includePinned: boolean;
  reason: string;
  source: NotificationDebugSource;
  logEmpty?: boolean;
};

function safeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function safeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getData(notification: Notifications.NotificationRequest): NotificationData {
  const data = notification.content?.data;
  return data && typeof data === 'object' ? data as NotificationData : {};
}

function getNotificationKind(data: NotificationData): 'shift' | 'pinned' | null {
  if (data.source === 'aerostaff') {
    return data.pinned === true ? 'pinned' : 'shift';
  }

  if (data.pinned === true) {
    return 'pinned';
  }

  const type = safeString(data.type);
  if (!type || type === 'shift_ongoing' || type === 'pinned_flight_ongoing') {
    return null;
  }

  return KNOWN_SHIFT_TYPES.has(type) ? 'shift' : null;
}

function getAeroStaffRequests(requests: Notifications.NotificationRequest[]) {
  return requests
    .map(request => ({ request, kind: getNotificationKind(getData(request)) }))
    .filter((item): item is { request: Notifications.NotificationRequest; kind: 'shift' | 'pinned' } => !!item.kind);
}

function buildDuplicateKey(request: Notifications.NotificationRequest, kind: 'shift' | 'pinned'): string {
  const data = getData(request);
  const explicit = safeString(data.dedupeKey);
  if (explicit) {
    return explicit;
  }

  const type = safeString(data.type) ?? 'unknown';
  const flightNumber = safeString(data.flightNumber) ?? 'shift';
  const ts = safeNumber(data.ts)
    ?? safeNumber(data.depTs)
    ?? safeNumber(data.arrTs)
    ?? safeNumber(data.when)
    ?? request.identifier;
  return `${kind}:${type}:${flightNumber}:${ts}`;
}

async function readStringArray(key: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

async function cancelIds(ids: string[]): Promise<number> {
  let cancelled = 0;
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
      cancelled += 1;
    } catch {}
  }
  return cancelled;
}

export async function appendNotificationDebugEvent(event: Omit<NotificationDebugEvent, 'at'>) {
  try {
    const raw = await AsyncStorage.getItem(DEBUG_EVENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const events = Array.isArray(parsed) ? parsed : [];
    const next = [{ ...event, at: Date.now() }, ...events].slice(0, MAX_DEBUG_EVENTS);
    await AsyncStorage.setItem(DEBUG_EVENTS_KEY, JSON.stringify(next));
  } catch {}
}

export function buildNotificationData(input: {
  scheduler: string;
  type: string;
  flightNumber?: string;
  ts?: number;
  pinned?: boolean;
  extra?: Record<string, unknown>;
}): NotificationData {
  const flightNumber = input.flightNumber ?? 'shift';
  const dedupeKey = `${input.pinned ? 'pinned' : 'shift'}:${input.type}:${flightNumber}:${input.ts ?? 'na'}`;
  return {
    source: 'aerostaff',
    scheduler: input.scheduler,
    type: input.type,
    flightNumber,
    ts: input.ts,
    pinned: input.pinned === true,
    dedupeKey,
    ...input.extra,
  };
}

export async function cancelAeroStaffScheduledNotifications(scope: NotificationCancelScope): Promise<number> {
  const before = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  const ids = new Set<string>();

  if (scope.includeShift) {
    for (const id of await readStringArray(NOTIF_IDS_KEY)) {
      ids.add(id);
    }
  }

  if (scope.includePinned) {
    for (const id of await readStringArray(PINNED_NOTIF_IDS_KEY)) {
      ids.add(id);
    }
  }

  for (const { request, kind } of getAeroStaffRequests(before)) {
    if ((kind === 'shift' && scope.includeShift) || (kind === 'pinned' && scope.includePinned)) {
      ids.add(request.identifier);
    }
  }

  const cancelled = await cancelIds(Array.from(ids));
  if (scope.includeShift) {
    await AsyncStorage.removeItem(NOTIF_IDS_KEY);
  }
  if (scope.includePinned) {
    await AsyncStorage.removeItem(PINNED_NOTIF_IDS_KEY);
  }

  if (cancelled > 0 || scope.logEmpty !== false) {
    await appendNotificationDebugEvent({
      source: scope.source,
      type: 'cancel',
      message: `Cancelled scheduled notifications: ${scope.reason}`,
      cancelled,
      pending: before.length,
      meta: {
        includeShift: scope.includeShift,
        includePinned: scope.includePinned,
        reason: scope.reason,
      },
    });
  }

  return cancelled;
}

export async function getNotificationDebugSnapshot(): Promise<NotificationDebugSnapshot> {
  const [
    enabledRaw,
    shiftIds,
    pinnedIds,
    lastScheduleDay,
    eventRaw,
    pending,
  ] = await Promise.all([
    AsyncStorage.getItem(NOTIF_ENABLED_KEY),
    readStringArray(NOTIF_IDS_KEY),
    readStringArray(PINNED_NOTIF_IDS_KEY),
    AsyncStorage.getItem(LAST_SCHEDULE_KEY),
    AsyncStorage.getItem(DEBUG_EVENTS_KEY),
    Notifications.getAllScheduledNotificationsAsync().catch(() => []),
  ]);

  const aeroStaff = getAeroStaffRequests(pending);
  const duplicateMap = new Map<string, { count: number; titles: Set<string> }>();
  for (const item of aeroStaff) {
    const key = buildDuplicateKey(item.request, item.kind);
    const current = duplicateMap.get(key) ?? { count: 0, titles: new Set<string>() };
    current.count += 1;
    if (item.request.content?.title) {
      current.titles.add(item.request.content.title);
    }
    duplicateMap.set(key, current);
  }

  let lastEvents: NotificationDebugEvent[] = [];
  try {
    const parsed = eventRaw ? JSON.parse(eventRaw) : [];
    lastEvents = Array.isArray(parsed) ? parsed as NotificationDebugEvent[] : [];
  } catch {}

  return {
    enabled: enabledRaw === 'true',
    savedShiftIds: shiftIds.length,
    savedPinnedIds: pinnedIds.length,
    pendingTotal: pending.length,
    pendingAeroStaff: aeroStaff.length,
    pendingShift: aeroStaff.filter(item => item.kind === 'shift').length,
    pendingPinned: aeroStaff.filter(item => item.kind === 'pinned').length,
    possibleDuplicates: Array.from(duplicateMap.entries())
      .filter(([, value]) => value.count > 1)
      .map(([key, value]) => ({
        key,
        count: value.count,
        titles: Array.from(value.titles).slice(0, 3),
      })),
    lastScheduleDay,
    lastEvents,
  };
}
