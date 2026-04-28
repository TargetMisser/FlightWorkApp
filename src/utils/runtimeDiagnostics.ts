import { NativeModules, Platform } from 'react-native';

export type RuntimeReport = {
  type: string;
  message: string;
  timestamp: string;
  thread?: string;
  stack?: string;
  appVersion?: string;
  device?: string;
  androidVersion?: string;
  liquidGlassEnabled?: boolean;
  liquidGlassSupported?: boolean;
  liquidGlassAutoDisabled?: boolean;
  startupPending?: boolean;
  metadata?: Record<string, string>;
};

export type RuntimeDiagnosticsState = {
  appVersion: string;
  device: string;
  androidVersion: string;
  liquidGlassSupported: boolean;
  liquidGlassEnabled: boolean;
  liquidGlassAutoDisabled: boolean;
  startupPending: boolean;
  startupStartedAt?: number;
  startupCompletedAt?: number;
  logFilePath?: string;
  lastReport: RuntimeReport | null;
};

type RuntimeDiagnosticsNativeModule = {
  liquidGlassSupported?: boolean;
  liquidGlassEnabled?: boolean;
  liquidGlassAutoDisabled?: boolean;
  initialDiagnosticsJson?: string;
  getRuntimeDiagnostics?: () => Promise<string>;
  clearLastReport?: () => Promise<boolean>;
  markStartupCompleted?: () => Promise<boolean>;
  setLiquidGlassEnabled?: (enabled: boolean) => Promise<boolean>;
  recordJsError?: (
    message: string,
    stack: string,
    isFatal: boolean,
    source: string,
  ) => Promise<boolean>;
};

type ErrorUtilsShape = {
  getGlobalHandler?: () => ((error: unknown, isFatal?: boolean) => void) | undefined;
  setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
};

const runtimeModule = NativeModules.RuntimeDiagnostics as RuntimeDiagnosticsNativeModule | undefined;

function fallbackState(): RuntimeDiagnosticsState {
  return {
    appVersion: '',
    device: '',
    androidVersion: '',
    liquidGlassSupported: false,
    liquidGlassEnabled: false,
    liquidGlassAutoDisabled: false,
    startupPending: false,
    lastReport: null,
  };
}

function parseDiagnostics(payload?: string | null): RuntimeDiagnosticsState {
  if (!payload) {
    return fallbackState();
  }

  try {
    const parsed = JSON.parse(payload) as Partial<RuntimeDiagnosticsState>;
    return {
      ...fallbackState(),
      ...parsed,
      lastReport: parsed.lastReport ?? null,
    };
  } catch {
    return fallbackState();
  }
}

const initialRuntimeDiagnostics = parseDiagnostics(runtimeModule?.initialDiagnosticsJson);
let jsCrashHandlerInstalled = false;

function normalizeError(error: unknown): { message: string; stack: string } {
  if (error instanceof Error) {
    return {
      message: error.message || error.name || 'Unknown error',
      stack: error.stack || '',
    };
  }

  const message = typeof error === 'string' ? error : JSON.stringify(error);
  return {
    message: message || 'Unknown error',
    stack: '',
  };
}

export function isNativeLiquidGlassEnabledAtLaunch(): boolean {
  return Platform.OS === 'android'
    && initialRuntimeDiagnostics.liquidGlassSupported
    && initialRuntimeDiagnostics.liquidGlassEnabled;
}

export async function getRuntimeDiagnostics(): Promise<RuntimeDiagnosticsState> {
  if (!runtimeModule?.getRuntimeDiagnostics) {
    return initialRuntimeDiagnostics;
  }

  try {
    const payload = await runtimeModule.getRuntimeDiagnostics();
    return parseDiagnostics(payload);
  } catch {
    return initialRuntimeDiagnostics;
  }
}

export async function clearLastRuntimeReport(): Promise<void> {
  await runtimeModule?.clearLastReport?.();
}

export async function markRuntimeStartupCompleted(): Promise<void> {
  await runtimeModule?.markStartupCompleted?.();
}

export async function setNativeLiquidGlassEnabled(enabled: boolean): Promise<void> {
  await runtimeModule?.setLiquidGlassEnabled?.(enabled);
}

export async function recordRuntimeError(
  error: unknown,
  source: string,
  isFatal = false,
): Promise<void> {
  if (!runtimeModule?.recordJsError) {
    return;
  }

  const normalized = normalizeError(error);
  await runtimeModule.recordJsError(
    normalized.message,
    normalized.stack,
    isFatal,
    source,
  );
}

export function installGlobalCrashHandler(): void {
  if (jsCrashHandlerInstalled) {
    return;
  }

  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsShape }).ErrorUtils;
  const defaultHandler = errorUtils?.getGlobalHandler?.();
  if (!errorUtils?.setGlobalHandler || !defaultHandler) {
    return;
  }

  jsCrashHandlerInstalled = true;
  errorUtils.setGlobalHandler((error, isFatal) => {
    void recordRuntimeError(error, 'global', Boolean(isFatal))
      .catch(() => {})
      .finally(() => {
        defaultHandler(error, isFatal);
      });
  });
}
