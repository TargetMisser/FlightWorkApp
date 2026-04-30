import { Linking, Platform } from 'react-native';
import * as Application from 'expo-application';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';

import type { UpdateInfo } from './updateChecker';

const APK_MIME_TYPE = 'application/vnd.android.package-archive';
const INSTALL_PACKAGE_ACTION = 'android.intent.action.INSTALL_PACKAGE';
const FLAG_GRANT_READ_URI_PERMISSION = 1;
const EXTRA_RETURN_RESULT = 'android.intent.extra.RETURN_RESULT';
const DOWNLOAD_DIR = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}updates/` : null;

export type UpdateDownloadProgress = {
  receivedBytes: number;
  totalBytes: number;
  progress: number | null;
};

function ensureDownloadUrl(info: UpdateInfo): string {
  if (!info.downloadUrl) {
    throw new Error('Nessun file APK disponibile per questa release.');
  }

  return info.downloadUrl;
}

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-z0-9._-]+/gi, '-').replace(/-+/g, '-');
}

function getFileName(info: UpdateInfo): string {
  const assetName = info.assetName?.trim();
  if (assetName) {
    return sanitizeSegment(assetName);
  }

  return `AeroStaffPro-${sanitizeSegment(info.latestVersion || 'update')}.apk`;
}

function getTargetUri(info: UpdateInfo): string {
  if (!DOWNLOAD_DIR) {
    throw new Error('La directory di download non è disponibile su questo dispositivo.');
  }

  return `${DOWNLOAD_DIR}${getFileName(info)}`;
}

async function ensureDownloadDirectory(): Promise<void> {
  if (!DOWNLOAD_DIR) {
    throw new Error('La directory di download non è disponibile su questo dispositivo.');
  }

  const dirInfo = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, { intermediates: true });
  }
}

export async function getDownloadedUpdateUri(info: UpdateInfo): Promise<string | null> {
  if (!DOWNLOAD_DIR || !info.downloadUrl) {
    return null;
  }

  const fileUri = getTargetUri(info);
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  return fileInfo.exists && !fileInfo.isDirectory ? fileInfo.uri : null;
}

export async function downloadUpdatePackage(
  info: UpdateInfo,
  onProgress?: (progress: UpdateDownloadProgress) => void,
): Promise<string> {
  const downloadUrl = ensureDownloadUrl(info);
  const targetUri = getTargetUri(info);

  await ensureDownloadDirectory();
  await FileSystem.deleteAsync(targetUri, { idempotent: true });

  const downloadTask = FileSystem.createDownloadResumable(
    downloadUrl,
    targetUri,
    {},
    progressEvent => {
      const totalBytes = progressEvent.totalBytesExpectedToWrite;
      onProgress?.({
        receivedBytes: progressEvent.totalBytesWritten,
        totalBytes,
        progress: totalBytes > 0 ? progressEvent.totalBytesWritten / totalBytes : null,
      });
    },
  );

  const result = await downloadTask.downloadAsync();
  if (!result || result.status < 200 || result.status >= 300) {
    await FileSystem.deleteAsync(targetUri, { idempotent: true });
    throw new Error('Download aggiornamento non riuscito.');
  }

  return result.uri;
}

export async function installDownloadedUpdate(fileUri: string): Promise<void> {
  if (Platform.OS !== 'android') {
    await Linking.openURL(fileUri);
    return;
  }

  const contentUri = await FileSystem.getContentUriAsync(fileUri);
  const result = await IntentLauncher.startActivityAsync(INSTALL_PACKAGE_ACTION, {
    data: contentUri,
    flags: FLAG_GRANT_READ_URI_PERMISSION,
    type: APK_MIME_TYPE,
    extra: {
      [EXTRA_RETURN_RESULT]: true,
    },
  });

  if (result.resultCode !== IntentLauncher.ResultCode.Success) {
    throw new Error(`Installazione APK non completata (resultCode=${result.resultCode}).`);
  }
}

export async function openUpdateReleasePage(info: UpdateInfo): Promise<void> {
  await Linking.openURL(info.releaseUrl);
}

export async function openUnknownSourcesSettings(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.MANAGE_UNKNOWN_APP_SOURCES, {
    data: Application.applicationId ? `package:${Application.applicationId}` : undefined,
  });
}
