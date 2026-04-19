import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

const BACKUP_VERSION = 1;

// Keys that represent user data worth preserving across reinstalls
const BACKUP_KEYS = [
  'aerostaff_notepad_v1',
  'aerostaff_passwords_v1',
  'aerostaff_pin_v1',
  'aerostaff_pin_enabled_v1',
  'aerostaff_phonebook_v1',
  'aerostaff_airport_code_v1',
  'aerostaff_language_v1',
  'aerostaff_theme_mode',
  'aerostaff_flight_filter_v1',
  'manuals_data_v2',
  '@shift_import_name',
  'aerostaff_notif_enabled',
];

export type BackupResult = { ok: true } | { ok: false; error: string };

export async function exportBackup(): Promise<BackupResult> {
  try {
    const pairs = await AsyncStorage.multiGet(BACKUP_KEYS);
    const data: Record<string, string | null> = {};
    for (const [key, value] of pairs) data[key] = value;

    const payload = JSON.stringify({ version: BACKUP_VERSION, exportedAt: Date.now(), data }, null, 2);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `AeroStaffPro-backup-${dateStr}.json`;

    // Ask user to choose a folder via SAF
    const perms = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!perms.granted) return { ok: false, error: 'Permesso negato' };

    const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
      perms.directoryUri,
      filename,
      'application/json',
    );
    await FileSystem.writeAsStringAsync(fileUri, payload, { encoding: FileSystem.EncodingType.UTF8 });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Errore sconosciuto' };
  }
}

export async function importBackup(): Promise<BackupResult> {
  try {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
    if (result.canceled) return { ok: false, error: 'Annullato' };

    const uri = result.assets[0].uri;
    const raw = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, error: 'File non valido' };
    }

    if (!parsed.version || !parsed.data || typeof parsed.data !== 'object') {
      return { ok: false, error: 'Formato backup non riconosciuto' };
    }

    const pairs: [string, string][] = Object.entries(parsed.data)
      .filter(([key, val]) => BACKUP_KEYS.includes(key) && val !== null && val !== undefined)
      .map(([key, val]) => [key, val as string]);

    if (pairs.length === 0) return { ok: false, error: 'Nessun dato trovato nel backup' };

    await AsyncStorage.multiSet(pairs);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Errore sconosciuto' };
  }
}
