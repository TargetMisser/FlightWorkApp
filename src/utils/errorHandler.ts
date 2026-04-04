import { Alert } from 'react-native';

type ErrorContext =
  | 'calendar'
  | 'ocr'
  | 'notification'
  | 'storage'
  | 'network'
  | 'pin'
  | 'flight'
  | 'import';

const CONTEXT_LABELS: Record<ErrorContext, string> = {
  calendar: 'Calendario',
  ocr: 'Riconoscimento testo',
  notification: 'Notifiche',
  storage: 'Salvataggio dati',
  network: 'Connessione',
  pin: 'PIN',
  flight: 'Dati volo',
  import: 'Importazione',
};

/**
 * Shared error handler: logs to console AND shows user alert.
 * Use for all catch blocks to ensure consistent error reporting.
 */
export function handleError(error: unknown, context: ErrorContext, silent = false): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${context}]`, message);

  if (!silent) {
    Alert.alert(
      `Errore ${CONTEXT_LABELS[context]}`,
      message || 'Si è verificato un errore imprevisto.',
    );
  }
}
