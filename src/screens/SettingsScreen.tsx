import { version } from '../../package.json';
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator,
  Alert, Modal, KeyboardAvoidingView, Platform, TextInput,
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

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { colors, mode, setMode, isLoading } = useAppTheme();
  const { airport, airportCode, setAirportCode, isLoading: airportLoading } = useAirport();
  const { t, lang, setLang, languages } = useLanguage();
  const [airportModalOpen, setAirportModalOpen] = useState(false);

  const translatedOptions = THEME_OPTIONS.map(opt => ({
    ...opt,
    label: opt.id === 'light' ? t('themeLight') : opt.id === 'dark' ? t('themeDark') : t('themeWeather'),
    sublabel: opt.id === 'light' ? t('themeLightSub') : opt.id === 'dark' ? t('themeDarkSub') : t('themeWeatherSub'),
  }));
  const [airportInput, setAirportInput] = useState(airportCode);

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
      Alert.alert(t('airportAlertInvalidTitle'), t('airportAlertInvalidMsg'));
      return;
    }

    try {
      await setAirportCode(normalized);
      setAirportModalOpen(false);
      Alert.alert(t('airportAlertUpdatedTitle'), t('airportAlertUpdatedMsg'));
    } catch {
      Alert.alert(t('airportAlertErrorTitle'), t('airportAlertErrorMsg'));
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
          <Text style={[styles.bannerSub, { color: colors.textMuted }]}>{`AeroStaff Pro · v${version}`}</Text>
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
        <SettingRow icon="info-outline"    label={t('appVersion')} sublabel={version}                  type="info" />
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
                <Text style={{ fontSize: 18 }}>{langOpt.flag}</Text>
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
});
