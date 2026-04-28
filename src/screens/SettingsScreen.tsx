import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator,
  Modal, KeyboardAvoidingView, Platform, Share, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme, ThemeMode } from '../context/ThemeContext';
import { useAirport } from '../context/AirportContext';
import { useLanguage } from '../context/LanguageContext';
import {
  AIRPORT_PRESETS,
  formatAirportSettingLabel,
  normalizeAirportCode,
  isValidAirportCode,
} from '../utils/airportSettings';
import {
  APP_VERSION,
  checkForUpdate,
  getCachedUpdateInfo,
  markUpdateSeen,
  type UpdateInfo,
} from '../utils/updateChecker';
import UpdateModal from '../components/UpdateModal';
import { exportBackup, importBackup } from '../utils/backupManager';
import { getStaffMonitorDebugStatus, getStaffMonitorDebugColumns, getStaffMonitorDebugFlights } from '../utils/staffMonitor';
import {
  clearLastRuntimeReport,
  getRuntimeDiagnostics,
  setNativeLiquidGlassEnabled,
  type RuntimeDiagnosticsState,
} from '../utils/runtimeDiagnostics';

// ─── Tema picker ──────────────────────────────────────────────────────────────
type ThemeOption = {
  id: ThemeMode;
  label: string;
  sublabel: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  previewBg: string;
  previewAccent: string;
  previewGradient?: [string, string];
};

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'light',
    label: 'Chiaro',
    sublabel: 'Tema standard, sfondo bianco',
    icon: 'light-mode',
    previewBg: '#F3F4F6',
    previewAccent: '#F47B16',
  },
  {
    id: 'dark',
    label: 'Scuro',
    sublabel: 'Ideale di notte, riduce affaticamento',
    icon: 'dark-mode',
    previewBg: '#0F172A',
    previewAccent: '#FF9A42',
  },
  {
    id: 'weather',
    label: 'Meteo',
    sublabel: 'Cambia in base a cielo, ora e meteo',
    icon: 'wb-cloudy',
    previewBg: '#0d1f3c',
    previewAccent: '#60A5FA',
    previewGradient: ['#1a3a6e', '#0d1f3c'],
  },
];

function ThemeCard({ option, selected, onSelect, activeLabel }: {
  option: ThemeOption;
  selected: boolean;
  onSelect: () => void;
  activeLabel: string;
}) {
  const { colors } = useAppTheme();
  return (
    <TouchableOpacity
      style={[
        styles.themeCard,
        { backgroundColor: colors.card, borderColor: selected ? colors.primary : colors.border },
        selected && styles.themeCardSelected,
      ]}
      onPress={onSelect}
      activeOpacity={0.8}
    >
      {/* Anteprima miniatura */}
      {option.previewGradient ? (
        <LinearGradient colors={option.previewGradient} style={styles.preview}>
          <View style={[styles.previewBar, { backgroundColor: 'rgba(255,255,255,0.12)' }]} />
          <View style={styles.previewContent}>
            <View style={[styles.previewCard, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
            <View style={[styles.previewCard, { backgroundColor: 'rgba(255,255,255,0.15)', width: '60%' }]} />
          </View>
          <View style={[styles.previewTab, { backgroundColor: 'rgba(255,255,255,0.10)' }]}>
            <View style={[styles.previewDot, { backgroundColor: option.previewAccent }]} />
          </View>
        </LinearGradient>
      ) : (
        <View style={[styles.preview, { backgroundColor: option.previewBg }]}>
          <View style={[styles.previewBar, { backgroundColor: option.previewBg === '#F3F4F6' ? '#fff' : 'rgba(255,255,255,0.12)' }]} />
          <View style={styles.previewContent}>
            <View style={[styles.previewCard, { backgroundColor: option.previewBg === '#F3F4F6' ? '#fff' : 'rgba(255,255,255,0.15)' }]} />
            <View style={[styles.previewCard, { backgroundColor: option.previewBg === '#F3F4F6' ? '#fff' : 'rgba(255,255,255,0.15)', width: '60%' }]} />
          </View>
          <View style={[styles.previewTab, { backgroundColor: option.previewBg === '#F3F4F6' ? '#fff' : 'rgba(255,255,255,0.12)' }]}>
            <View style={[styles.previewDot, { backgroundColor: option.previewAccent }]} />
          </View>
        </View>
      )}

      {/* Info */}
      <View style={styles.themeInfo}>
        <View style={styles.themeInfoTop}>
          <MaterialIcons name={option.icon} size={18} color={selected ? colors.primary : colors.textSub} />
          <Text style={[styles.themeLabel, { color: colors.text }, selected && { color: colors.primary }]}>
            {option.label}
          </Text>
          {selected && (
            <View style={[styles.activeBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.activeBadgeTxt}>{activeLabel}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.themeSub, { color: colors.textMuted }]}>{option.sublabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Riga impostazione generica ───────────────────────────────────────────────
function SettingRow({
  icon, label, sublabel, type, value, onToggle, onPress, disabled,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  sublabel?: string;
  type: 'arrow' | 'toggle' | 'info';
  value?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const { colors } = useAppTheme();
  const isPressable = type === 'arrow' && !!onPress && !disabled;
  const content = (
    <>
      <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
        <MaterialIcons name={icon} size={20} color={disabled ? colors.textMuted : colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        {sublabel && <Text style={[styles.rowSub, { color: colors.textMuted }]}>{sublabel}</Text>}
      </View>
      {type === 'arrow' && <MaterialIcons name="chevron-right" size={20} color={colors.border} />}
      {type === 'toggle' && <Switch value={value ?? false} onValueChange={onToggle} disabled={disabled} trackColor={{ true: colors.primary }} thumbColor="#fff" />}
    </>
  );

  if (isPressable) {
    return (
      <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.row, disabled && { opacity: 0.45 }]}>
      {content}
    </View>
  );
}

type DialogTone = 'success' | 'error' | 'warning' | 'info';
type DialogAction = {
  label: string;
  style?: 'primary' | 'secondary' | 'danger';
  onPress?: () => void | Promise<void>;
};
type DialogState = {
  title: string;
  message: string;
  tone: DialogTone;
  actions?: DialogAction[];
  scrollable?: boolean;
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { colors, mode, setMode, isLoading } = useAppTheme();
  const { airport, airportCode, setAirportCode, isLoading: airportLoading } = useAirport();
  const { t, lang, setLang, languages } = useLanguage();
  const [airportModalOpen, setAirportModalOpen] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState | null>(null);

  const translatedOptions = THEME_OPTIONS.map(opt => ({
    ...opt,
    label: opt.id === 'light' ? t('themeLight') : opt.id === 'dark' ? t('themeDark') : t('themeWeather'),
    sublabel: opt.id === 'light' ? t('themeLightSub') : opt.id === 'dark' ? t('themeDarkSub') : t('themeWeatherSub'),
  }));
  const [airportInput, setAirportInput] = useState(airportCode);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [exportingBackup, setExportingBackup] = useState(false);
  const [importingBackup, setImportingBackup] = useState(false);
  const [runtimeDiagnostics, setRuntimeDiagnostics] = useState<RuntimeDiagnosticsState | null>(null);

  useEffect(() => {
    getCachedUpdateInfo().then(setUpdateInfo);
    getRuntimeDiagnostics().then(setRuntimeDiagnostics).catch(() => {});
  }, []);

  const showDialog = useCallback((dialog: DialogState) => {
    setDialogState(dialog);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogState(null);
  }, []);

  const handleDialogAction = useCallback((action?: DialogAction) => {
    setDialogState(null);
    Promise.resolve()
      .then(() => action?.onPress?.())
      .catch(() => {});
  }, []);

  const handleCheckUpdate = useCallback(async () => {
    setCheckingUpdate(true);
    const info = await checkForUpdate(true);
    setUpdateInfo(info);
    setCheckingUpdate(false);
    if (!info) {
      showDialog({
        title: t('error'),
        message: t('updateCheckErrorMessage'),
        tone: 'error',
      });
    } else if (info.available) {
      setShowUpdateModal(true);
    } else {
      showDialog({
        title: t('updateCheckOkTitle'),
        message: t('updateCheckOkMessage').replace('{version}', APP_VERSION),
        tone: 'success',
      });
    }
  }, [showDialog, t]);

  const handleDownload = useCallback(() => {
    if (updateInfo?.available) {
      setShowUpdateModal(true);
    }
  }, [updateInfo]);

  const refreshRuntimeDiagnostics = useCallback(async () => {
    const next = await getRuntimeDiagnostics();
    setRuntimeDiagnostics(next);
    return next;
  }, []);

  const runtimeStatusLabel = useCallback((diag: RuntimeDiagnosticsState | null) => {
    if (!diag) {
      return 'Controllo stato runtime...';
    }
    if (!diag.liquidGlassSupported) {
      return 'Fallback attivo: dispositivo non supportato';
    }
    if (diag.liquidGlassAutoDisabled) {
      return 'Fallback attivo dopo errore runtime del nativo';
    }
    if (diag.liquidGlassEnabled) {
      return 'Nativo attivo su Android 14+';
    }
    return 'Fallback attivo: nativo disattivato';
  }, []);

  const runtimeDialogMessage = useCallback((diag: RuntimeDiagnosticsState) => {
    const lines = [
      `Liquid glass supportato: ${diag.liquidGlassSupported ? 'si' : 'no'}`,
      `Liquid glass attivo: ${diag.liquidGlassEnabled ? 'si' : 'no'}`,
      `Auto-disabilitato: ${diag.liquidGlassAutoDisabled ? 'si' : 'no'}`,
      `Startup pendente: ${diag.startupPending ? 'si' : 'no'}`,
      `Device: ${diag.device || 'n/d'}`,
      `Android: ${diag.androidVersion || 'n/d'}`,
      `Log file: ${diag.logFilePath || 'n/d'}`,
    ];

    if (!diag.lastReport) {
      lines.push('', 'Nessun crash log salvato.');
      return lines.join('\n');
    }

    const metadata = diag.lastReport.metadata
      ? Object.entries(diag.lastReport.metadata).map(([key, value]) => `${key}: ${value}`).join('\n')
      : 'n/d';

    lines.push(
      '',
      'Ultimo evento runtime',
      `Tipo: ${diag.lastReport.type}`,
      `Quando: ${new Date(diag.lastReport.timestamp).toLocaleString(lang === 'it' ? 'it-IT' : 'en-GB')}`,
      `Messaggio: ${diag.lastReport.message}`,
      `Thread: ${diag.lastReport.thread || 'n/d'}`,
      `Metadata:\n${metadata}`,
    );

    if (diag.lastReport.stack) {
      lines.push('', 'Stack', diag.lastReport.stack);
    }

    return lines.join('\n');
  }, [lang]);

  const handleOpenRuntimeDiagnostics = useCallback(async () => {
    const diag = runtimeDiagnostics ?? await refreshRuntimeDiagnostics();
    showDialog({
      title: 'Liquid glass runtime',
      message: runtimeDialogMessage(diag),
      tone: diag.lastReport ? 'warning' : 'info',
      scrollable: true,
      actions: [
        { label: t('ok'), style: 'secondary' },
        ...(diag.lastReport ? [{
          label: 'Condividi log',
          style: 'primary' as const,
          onPress: async () => {
            await Share.share({ message: runtimeDialogMessage(diag) });
          },
        }] : []),
        ...(diag.lastReport ? [{
          label: 'Pulisci log',
          style: 'secondary' as const,
          onPress: async () => {
            await clearLastRuntimeReport();
            await refreshRuntimeDiagnostics();
          },
        }] : []),
        ...(diag.liquidGlassSupported && !diag.liquidGlassEnabled ? [{
          label: diag.liquidGlassAutoDisabled ? 'Riattiva' : 'Attiva',
          style: 'primary' as const,
          onPress: async () => {
            await setNativeLiquidGlassEnabled(true);
            const next = await refreshRuntimeDiagnostics();
            showDialog({
              title: 'Liquid glass riattivato',
              message: next.liquidGlassAutoDisabled
                ? 'C\'e` ancora un blocco di sicurezza attivo. Chiudi e riapri l\'app, poi ritesta.'
                : 'Chiudi e riapri l\'app per attivare il renderer nativo. Se si rompe di nuovo, al riavvio tornera` al fallback e il log restera` qui.',
              tone: 'success',
            });
          },
        }] : []),
        ...(diag.liquidGlassSupported && diag.liquidGlassEnabled ? [{
          label: 'Disattiva',
          style: 'secondary' as const,
          onPress: async () => {
            await setNativeLiquidGlassEnabled(false);
            await refreshRuntimeDiagnostics();
            showDialog({
              title: 'Fallback attivato',
              message: 'Chiudi e riapri l\'app per usare solo blur/gradient senza renderer nativo.',
              tone: 'info',
            });
          },
        }] : []),
      ],
    });
  }, [refreshRuntimeDiagnostics, runtimeDiagnostics, runtimeDialogMessage, showDialog, t]);

  const handleExport = useCallback(async () => {
    setExportingBackup(true);
    const result = await exportBackup();
    setExportingBackup(false);
    if (result.ok) {
      showDialog({
        title: 'Backup esportato',
        message: 'File salvato nella cartella selezionata. Password e PIN non vengono inclusi per sicurezza.',
        tone: 'success',
      });
    } else if (result.error !== 'Permesso negato' && result.error !== 'Annullato') {
      showDialog({
        title: t('error'),
        message: result.error,
        tone: 'error',
      });
    }
  }, [showDialog, t]);

  const handleImport = useCallback(async () => {
    showDialog({
      title: 'Importa backup',
      message: 'I dati compatibili del backup (note, rubrica, manuali e impostazioni) sovrascriveranno quelli attuali. I backup recenti non includono password e PIN. Continuare?',
      tone: 'warning',
      actions: [
        { label: t('cancel'), style: 'secondary' },
        {
          label: 'Importa',
          style: 'danger',
          onPress: async () => {
            setImportingBackup(true);
            const result = await importBackup();
            setImportingBackup(false);
            if (result.ok) {
              showDialog({
                title: 'Backup importato',
                message: 'Riavvia l\'app per applicare tutte le modifiche.',
                tone: 'success',
              });
            } else if (result.error !== 'Annullato') {
              showDialog({
                title: t('error'),
                message: result.error,
                tone: 'error',
              });
            }
          },
        },
      ],
    });
  }, [showDialog, t]);

  const openAirportModal = () => {
    setAirportInput(airportCode);
    setAirportModalOpen(true);
  };

  const closeAirportModal = () => {
    setAirportModalOpen(false);
    setAirportInput(airportCode);
  };

  const saveAirport = async () => {
    const normalized = normalizeAirportCode(airportInput);
    if (!isValidAirportCode(normalized)) {
      showDialog({
        title: t('airportAlertInvalidTitle'),
        message: t('airportAlertInvalidMsg'),
        tone: 'error',
      });
      return;
    }

    try {
      await setAirportCode(normalized);
      setAirportModalOpen(false);
      showDialog({
        title: t('airportAlertUpdatedTitle'),
        message: t('airportAlertUpdatedMsg'),
        tone: 'success',
      });
    } catch {
      showDialog({
        title: t('airportAlertErrorTitle'),
        message: t('airportAlertErrorMsg'),
        tone: 'error',
      });
    }
  };

  return (
    <>
      <ScrollView
        style={[styles.root, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
      {/* Header */}
      <View style={[styles.banner, { backgroundColor: colors.card, borderColor: colors.border }, colors.isDark ? { shadowOpacity: 0, elevation: 0, borderWidth: 1 } : { shadowColor: colors.primary }]}>
        <View style={[styles.bannerIcon, { backgroundColor: colors.primaryLight }]}>
          <MaterialIcons name="settings" size={28} color={colors.primary} />
        </View>
        <View>
          <Text style={[styles.bannerTitle, { color: colors.primaryDark }]}>{t('settingsTitle')}</Text>
          <Text style={[styles.bannerSub, { color: colors.textMuted }]}>AeroStaff Pro · v{APP_VERSION}</Text>
        </View>
      </View>

      {/* ── Sezione Tema ── */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('sectionTheme')}</Text>

      {isLoading ? (
        <View style={[styles.card, { backgroundColor: colors.card, alignItems: 'center', padding: 24 }]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.rowSub, { color: colors.textMuted, marginTop: 8 }]}>
            {t('themeLoading')}
          </Text>
        </View>
      ) : (
        <View style={styles.themeGrid}>
          {translatedOptions.map(opt => (
            <ThemeCard
              key={opt.id}
              option={opt}
              selected={mode === opt.id}
              onSelect={() => setMode(opt.id)}
              activeLabel={t('themeActive')}
            />
          ))}
        </View>
      )}

      {/* ── Sezione Account ── */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('sectionAccount')}</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, colors.isDark && { elevation: 0, shadowOpacity: 0, borderWidth: 1 }]}>
        <SettingRow icon="person-outline"  label={t('accountProfile')} sublabel={t('accountProfileSub')}   type="arrow" disabled />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow icon="badge"           label={t('accountId')} sublabel={t('accountIdSub')}          type="arrow" disabled />
      </View>

      {/* ── Sezione Aeroporto ── */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('sectionAirport')}</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, colors.isDark && { elevation: 0, shadowOpacity: 0, borderWidth: 1 }]}>
        <SettingRow
          icon="flight-land"
          label={t('airportBase')}
          sublabel={airportLoading ? t('airportLoading') : formatAirportSettingLabel(airport.code)}
          type="arrow"
          onPress={airportLoading ? undefined : openAirportModal}
          disabled={airportLoading}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow icon="airlines"        label={t('airportAirlines')} sublabel={t('airportAirlinesSub')}     type="arrow" disabled />
      </View>

      {/* ── Sezione Notifiche ── */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('sectionNotifications')}</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, colors.isDark && { elevation: 0, shadowOpacity: 0, borderWidth: 1 }]}>
        <SettingRow icon="notifications"   label={t('notifFlights')} sublabel={t('notifFlightsSub')}  type="info" />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow icon="alarm"           label={t('notifReminder')} sublabel={t('notifReminderSub')}            type="toggle" disabled />
      </View>

      {/* ── Info app ── */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('sectionApp')}</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, colors.isDark && { elevation: 0, shadowOpacity: 0, borderWidth: 1 }]}>
        <SettingRow icon="info-outline" label={t('appVersion')} sublabel={`v${APP_VERSION}`} type="info" />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <TouchableOpacity
          style={styles.row}
          onPress={handleOpenRuntimeDiagnostics}
          activeOpacity={0.8}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
            <MaterialIcons name="blur-on" size={20} color={colors.primary} />
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Liquid glass runtime</Text>
            <Text style={[styles.rowSub, { color: colors.textMuted }]}>{runtimeStatusLabel(runtimeDiagnostics)}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={colors.border} />
        </TouchableOpacity>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <TouchableOpacity
          style={styles.row}
          onPress={() => showDialog({
            title: 'StaffMonitor debug',
            message: `Stato: ${getStaffMonitorDebugStatus()}\n\nColonne:\n${getStaffMonitorDebugColumns()}\n\nVoli (D, primi 5):\n${getStaffMonitorDebugFlights()}`,
            tone: 'info',
            scrollable: true,
          })}
          activeOpacity={0.8}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
            <MaterialIcons name="bug-report" size={20} color={colors.primary} />
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Debug StaffMonitor</Text>
            <Text style={[styles.rowSub, { color: colors.textMuted }]}>Tocca per vedere colonne rilevate</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Sezione Aggiornamenti ── */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>AGGIORNAMENTI</Text>
      <View style={[styles.updateCard, { backgroundColor: colors.card, borderColor: updateInfo?.available ? colors.primary : colors.border }, colors.isDark && { elevation: 0, borderWidth: 1 }]}>
        {/* Version row */}
        <View style={styles.updateTop}>
          <View style={[styles.updateIconWrap, { backgroundColor: updateInfo?.available ? colors.primary : colors.primaryLight }]}>
            <MaterialIcons name="system-update" size={24} color={updateInfo?.available ? '#fff' : colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.updateTitle, { color: colors.text }]}>
              {updateInfo?.available ? `Aggiornamento disponibile` : 'AeroStaff Pro'}
            </Text>
            <Text style={[styles.updateSub, { color: colors.textMuted }]}>
              {updateInfo?.available
                ? `Versione ${updateInfo.latestVersion} pronta`
                : `v${APP_VERSION} · versione installata`}
            </Text>
          </View>
          {updateInfo?.available && (
            <View style={[styles.newBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.newBadgeTxt}>NEW</Text>
            </View>
          )}
        </View>
        {/* Action buttons */}
        <View style={styles.updateActions}>
          <TouchableOpacity
            style={[styles.updateBtn, { backgroundColor: colors.primaryLight, borderColor: colors.border, borderWidth: 1 }, checkingUpdate && { opacity: 0.6 }]}
            onPress={handleCheckUpdate}
            disabled={checkingUpdate}
            activeOpacity={0.8}
          >
            {checkingUpdate
              ? <ActivityIndicator size={14} color={colors.primary} />
              : <MaterialIcons name="refresh" size={16} color={colors.primary} />}
            <Text style={[styles.updateBtnTxt, { color: colors.primary }]}>
              {checkingUpdate ? 'Controllo…' : 'Controlla'}
            </Text>
          </TouchableOpacity>
          {updateInfo?.available && (
            <TouchableOpacity
              style={[styles.updateBtn, { backgroundColor: colors.primary, flex: 1 }]}
              onPress={handleDownload}
              activeOpacity={0.8}
            >
              <MaterialIcons name="download" size={16} color="#fff" />
              <Text style={[styles.updateBtnTxt, { color: '#fff', fontWeight: '800' }]}>
                Gestisci v{updateInfo.latestVersion.replace(/^v/i, '')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Sezione Backup ── */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>BACKUP</Text>
      <View style={styles.backupRow}>
        {/* Esporta */}
        <TouchableOpacity
          style={[styles.backupTile, { backgroundColor: colors.card, borderColor: colors.border }, colors.isDark && { borderWidth: 1 }, exportingBackup && { opacity: 0.6 }]}
          onPress={handleExport}
          disabled={exportingBackup}
          activeOpacity={0.8}
        >
          <View style={[styles.backupTileIcon, { backgroundColor: '#10B98122' }]}>
            {exportingBackup
              ? <ActivityIndicator size={22} color="#10B981" />
              : <MaterialIcons name="upload" size={26} color="#10B981" />}
          </View>
          <Text style={[styles.backupTileLabel, { color: colors.text }]}>Esporta</Text>
          <Text style={[styles.backupTileSub, { color: colors.textMuted }]}>Salva su file</Text>
        </TouchableOpacity>
        {/* Importa */}
        <TouchableOpacity
          style={[styles.backupTile, { backgroundColor: colors.card, borderColor: colors.border }, colors.isDark && { borderWidth: 1 }, importingBackup && { opacity: 0.6 }]}
          onPress={handleImport}
          disabled={importingBackup}
          activeOpacity={0.8}
        >
          <View style={[styles.backupTileIcon, { backgroundColor: '#3B82F622' }]}>
            {importingBackup
              ? <ActivityIndicator size={22} color="#3B82F6" />
              : <MaterialIcons name="download" size={26} color="#3B82F6" />}
          </View>
          <Text style={[styles.backupTileLabel, { color: colors.text }]}>Importa</Text>
          <Text style={[styles.backupTileSub, { color: colors.textMuted }]}>Ripristina da file</Text>
        </TouchableOpacity>
      </View>

      {/* ── Sezione Lingua ── */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('sectionLanguage')}</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, colors.isDark && { elevation: 0, shadowOpacity: 0, borderWidth: 1 }]}>
        {languages.map((langOpt, idx) => (
          <React.Fragment key={langOpt.code}>
            {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
            <TouchableOpacity
              style={[styles.row, lang === langOpt.code && { backgroundColor: colors.primaryLight }]}
              onPress={() => setLang(langOpt.code)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
                <MaterialIcons name="language" size={18} color={colors.primary} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>{langOpt.label}</Text>
              </View>
              {lang === langOpt.code && (
                <MaterialIcons name="check-circle" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {showUpdateModal && updateInfo && (
        <UpdateModal
          info={updateInfo}
          onDismiss={() => {
            markUpdateSeen(updateInfo.latestVersion).catch(() => {});
            setShowUpdateModal(false);
          }}
        />
      )}

      {dialogState && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={closeDialog}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeDialog} />
            <View style={[styles.statusModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[
                styles.statusModalIconWrap,
                {
                  backgroundColor:
                    dialogState.tone === 'success'
                      ? colors.primaryLight
                      : dialogState.tone === 'warning'
                        ? '#F59E0B22'
                        : dialogState.tone === 'info'
                          ? '#2563EB22'
                          : '#DC262622',
                },
              ]}>
                <MaterialIcons
                  name={
                    dialogState.tone === 'success'
                      ? 'verified'
                      : dialogState.tone === 'warning'
                        ? 'warning-amber'
                        : dialogState.tone === 'info'
                          ? 'info-outline'
                          : 'error-outline'
                  }
                  size={24}
                  color={
                    dialogState.tone === 'success'
                      ? colors.primary
                      : dialogState.tone === 'warning'
                        ? '#D97706'
                        : dialogState.tone === 'info'
                          ? '#2563EB'
                          : '#DC2626'
                  }
                />
              </View>
              <Text style={[styles.statusModalTitle, { color: colors.text }]}>{dialogState.title}</Text>
              {dialogState.scrollable ? (
                <ScrollView
                  style={styles.statusModalScroll}
                  contentContainerStyle={styles.statusModalScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={[styles.statusModalMessage, { color: colors.textSub }]}>{dialogState.message}</Text>
                </ScrollView>
              ) : (
                <Text style={[styles.statusModalMessage, { color: colors.textSub }]}>{dialogState.message}</Text>
              )}
              <View style={styles.statusModalActions}>
                {(dialogState.actions ?? [{ label: t('ok'), style: 'primary' }]).map((action, index) => {
                  const actionStyle = action.style ?? 'primary';
                  return (
                    <TouchableOpacity
                      key={`${action.label}_${index}`}
                      style={[
                        styles.statusModalBtn,
                        actionStyle === 'primary' && { backgroundColor: colors.primary },
                        actionStyle === 'secondary' && {
                          backgroundColor: colors.cardSecondary,
                          borderColor: colors.border,
                          borderWidth: 1,
                        },
                        actionStyle === 'danger' && { backgroundColor: '#DC2626' },
                      ]}
                      onPress={() => { handleDialogAction(action); }}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.statusModalBtnText,
                          actionStyle === 'secondary' && { color: colors.text },
                        ]}
                      >
                        {action.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>
      )}

      <Modal
        visible={airportModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closeAirportModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeAirportModal} />
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.primaryDark }]}>{t('airportModalTitle')}</Text>
            <Text style={[styles.modalCopy, { color: colors.textMuted }]}>

              {t('airportModalCopy')}
            </Text>

            <Text style={[styles.modalLabel, { color: colors.textMuted }]}>{t('airportModalLabel')}</Text>
            <TextInput
              value={airportInput}
              onChangeText={text => setAirportInput(normalizeAirportCode(text))}
              placeholder="PSA"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={3}
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
            />

            <Text style={[styles.modalLabel, { color: colors.textMuted }]}>{t('airportModalQuickPick')}</Text>
            <View style={styles.airportChipWrap}>
              {AIRPORT_PRESETS.map(item => {
                const selected = airportInput === item.code;
                return (
                  <TouchableOpacity
                    key={item.code}
                    style={[
                      styles.airportChip,
                      {
                        backgroundColor: selected ? colors.primary : colors.cardSecondary,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setAirportInput(item.code)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.airportChipCode, { color: selected ? '#fff' : colors.text }]}>
                      {item.code}
                    </Text>
                    <Text style={[styles.airportChipName, { color: selected ? 'rgba(255,255,255,0.82)' : colors.textMuted }]}>
                      {item.city}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.cardSecondary, borderColor: colors.border, borderWidth: 1 }]}
                onPress={closeAirportModal}
                activeOpacity={0.85}
              >
                <Text style={[styles.modalBtnTxt, { color: colors.text }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={saveAirport}
                activeOpacity={0.85}
              >
                <Text style={[styles.modalBtnTxt, { color: '#fff' }]}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  content: { padding: 16, paddingBottom: 96 },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 16, padding: 18, marginBottom: 20,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  bannerIcon:  { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  bannerTitle: { fontSize: 18, fontWeight: '800' },
  bannerSub:   { fontSize: 12, marginTop: 2 },

  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, marginBottom: 8, paddingLeft: 4, marginTop: 4 },

  // Theme grid
  themeGrid: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  themeCard: {
    flex: 1, minWidth: 100,
    borderRadius: 16, borderWidth: 2,
    overflow: 'hidden',
  },
  themeCardSelected: {
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 5,
  },
  preview: { height: 80, justifyContent: 'space-between' },
  previewBar:     { height: 12, width: '100%' },
  previewContent: { flex: 1, padding: 6, gap: 4 },
  previewCard:    { height: 10, borderRadius: 4, width: '100%' },
  previewTab:     { height: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  previewDot:     { width: 8, height: 8, borderRadius: 4 },
  themeInfo:      { padding: 10 },
  themeInfoTop:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3, flexWrap: 'wrap' },
  themeLabel:     { fontSize: 13, fontWeight: '700' },
  activeBadge:    { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, flexShrink: 0 },
  activeBadgeTxt: { fontSize: 9, fontWeight: '800', color: '#fff' },
  themeSub:       { fontSize: 10, lineHeight: 14 },

  // Generic rows
  card: {
    borderRadius: 16, marginBottom: 20,
    shadowColor: '#F47B16', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, overflow: 'hidden',
  },
  divider: { height: 1, marginLeft: 56 },
  row:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  iconWrap:{ width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  rowText: { flex: 1 },
  rowLabel:{ fontSize: 14, fontWeight: '600' },
  rowSub:  { fontSize: 12, marginTop: 1 },
  modalOverlay: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(15,23,42,0.48)' },
  modalCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  modalCopy: { fontSize: 13, lineHeight: 20, marginBottom: 16 },
  modalLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  airportChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  airportChip: {
    minWidth: 88,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  airportChipCode: { fontSize: 14, fontWeight: '800' },
  airportChipName: { fontSize: 11, marginTop: 2 },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  modalBtnTxt: { fontSize: 14, fontWeight: '700' },
  statusModalCard: {
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 14,
    alignItems: 'center',
  },
  statusModalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  statusModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  statusModalScroll: {
    width: '100%',
    maxHeight: 240,
    marginTop: 10,
    marginBottom: 18,
  },
  statusModalScrollContent: {
    paddingHorizontal: 2,
  },
  statusModalMessage: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 18,
  },
  statusModalActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  statusModalBtn: {
    flex: 1,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 13,
    alignItems: 'center',
  },
  statusModalBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },

  // Update card
  updateCard: {
    borderRadius: 16, marginBottom: 20, padding: 16,
    borderWidth: 1,
    shadowColor: '#F47B16', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  updateTop:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  updateIconWrap:{ width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  updateTitle:   { fontSize: 15, fontWeight: '700' },
  updateSub:     { fontSize: 12, marginTop: 2 },
  newBadge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  newBadgeTxt:   { fontSize: 11, fontWeight: '800', color: '#fff' },
  updateActions: { flexDirection: 'row', gap: 10 },
  updateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16,
  },
  updateBtnTxt: { fontSize: 13, fontWeight: '700' },

  // Backup tiles
  backupRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  backupTile: {
    flex: 1, borderRadius: 16, padding: 18, alignItems: 'center', gap: 8,
    borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  backupTileIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  backupTileLabel:{ fontSize: 14, fontWeight: '800' },
  backupTileSub:  { fontSize: 11, textAlign: 'center' },
});
