import AsyncStorage from '@react-native-async-storage/async-storage';

export const APP_VERSION = '2.5.0';
const REPO = 'targetmisser/flightworkapp';
const CHECK_KEY = 'aerostaff_update_check_v1';

export type UpdateInfo = {
  available: boolean;
  latestVersion: string;
  downloadUrl: string;
  releaseUrl: string;
  checkedAt: number;
};

function parseVersion(v: string): number[] {
  return v.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
}

function isNewer(remote: string, current: string): boolean {
  const r = parseVersion(remote);
  const c = parseVersion(current);
  for (let i = 0; i < Math.max(r.length, c.length); i++) {
    const diff = (r[i] ?? 0) - (c[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

export async function checkForUpdate(force = false): Promise<UpdateInfo | null> {
  try {
    const now = Date.now();

    if (!force) {
      const raw = await AsyncStorage.getItem(CHECK_KEY);
      if (raw) {
        const cached: UpdateInfo = JSON.parse(raw);
        // Re-use cached result for 24 hours
        if (now - cached.checkedAt < 24 * 60 * 60 * 1000) return cached;
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    let json: any;
    try {
      const resp = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
        signal: controller.signal,
        headers: { Accept: 'application/vnd.github+json' },
      });
      clearTimeout(timer);
      if (!resp.ok) return null;
      json = await resp.json();
    } catch {
      clearTimeout(timer);
      return null;
    }

    const tag: string = json.tag_name ?? '';
    const apkAsset = json.assets?.find((a: any) =>
      (a.name as string).endsWith('.apk'),
    );

    const info: UpdateInfo = {
      available: isNewer(tag, APP_VERSION),
      latestVersion: tag,
      downloadUrl: apkAsset?.browser_download_url ?? json.html_url,
      releaseUrl: json.html_url ?? '',
      checkedAt: now,
    };

    await AsyncStorage.setItem(CHECK_KEY, JSON.stringify(info));
    return info;
  } catch {
    return null;
  }
}

export async function getCachedUpdateInfo(): Promise<UpdateInfo | null> {
  try {
    const raw = await AsyncStorage.getItem(CHECK_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
