import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme, ThemeMode } from '../context/ThemeContext';
import * as Notifications from 'expo-notifications';

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
    previewAccent: '#2563EB',
  },
  {
    id: 'dark',
    label: 'Scuro',
    sublabel: 'Ideale di notte, riduce affaticamento',
    icon: 'dark-mode',
    previewBg: '#0F172A',
    previewAccent: '#3B82F6',
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

function ThemeCard({ option, selected, onSelect }: {
  option: ThemeOption;
  selected: boolean;
  onSelect: () => void;
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
              <Text style={styles.activeBadgeTxt}>Attivo</Text>
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
  icon, label, sublabel, type, value, onToggle, disabled,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  sublabel?: string;
  type: 'arrow' | 'toggle' | 'info';
  value?: boolean;
  onToggle?: (v: boolean) => void;
  disabled?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.row, disabled && { opacity: 0.45 }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
        <MaterialIcons name={icon} size={20} color={disabled ? colors.textMuted : colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        {sublabel && <Text style={[styles.rowSub, { color: colors.textMuted }]}>{sublabel}</Text>}
      </View>
      {type === 'arrow'  && <MaterialIcons name="chevron-right" size={20} color={colors.border} />}
      {type === 'toggle' && <Switch value={value ?? false} onValueChange={onToggle} disabled={disabled} trackColor={{ true: colors.primary }} thumbColor="#fff" />}
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { colors, mode, setMode, isLoading } = useAppTheme();

  return (
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
          <Text style={[styles.bannerTitle, { color: colors.primaryDark }]}>Impostazioni</Text>
          <Text style={[styles.bannerSub, { color: colors.textMuted }]}>AeroStaff Pro · v1.0</Text>
        </View>
      </View>

      {/* ── Sezione Tema ── */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>TEMA</Text>

      {isLoading ? (
        <View style={[styles.card, { backgroundColor: colors.card, alignItems: 'center', padding: 24 }]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.rowSub, { color: colors.textMuted, marginTop: 8 }]}>
            Caricamento tema meteo…
          </Text>
        </View>
      ) : (
        <View style={styles.themeGrid}>
          {THEME_OPTIONS.map(opt => (
            <ThemeCard
              key={opt.id}
              option={opt}
              selected={mode === opt.id}
              onSelect={() => setMode(opt.id)}
            />
          ))}
        </View>
      )}

      {/* ── Sezione Account ── */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ACCOUNT</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, colors.isDark && { elevation: 0, shadowOpacity: 0, borderWidth: 1 }]}>
        <SettingRow icon="person-outline"  label="Profilo"       sublabel="Nome, ruolo, compagnia"   type="arrow" disabled />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow icon="badge"           label="Matricola / ID" sublabel="Non configurato"          type="arrow" disabled />
      </View>

      {/* ── Sezione Aeroporto ── */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>AEROPORTO</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, colors.isDark && { elevation: 0, shadowOpacity: 0, borderWidth: 1 }]}>
        <SettingRow icon="flight-land"     label="Aeroporto base"      sublabel="PSA — Pisa International"    type="arrow" disabled />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow icon="airlines"        label="Compagnie monitorate" sublabel="Wizz, easyJet, Ryanair…"     type="arrow" disabled />
      </View>

      {/* ── Sezione Notifiche ── */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>NOTIFICHE</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, colors.isDark && { elevation: 0, shadowOpacity: 0, borderWidth: 1 }]}>
        <SettingRow icon="notifications"   label="Notifiche voli"   sublabel="Gestito nella tab Voli"  type="info" />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow icon="alarm"           label="Promemoria turno" sublabel="Prossimamente"            type="toggle" disabled />
      </View>

      {/* ── Info app ── */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>APP</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, colors.isDark && { elevation: 0, shadowOpacity: 0, borderWidth: 1 }]}>
        <SettingRow icon="info-outline"    label="Versione"         sublabel="1.0.0"                    type="info" />
      </View>

      {/* ── TEST NOTIFICA (rimuovere dopo test) ── */}
      <TouchableOpacity
        style={[styles.testBtn, { backgroundColor: colors.primary }]}
        onPress={async () => {
          const { status } = await Notifications.requestPermissionsAsync();
          if (status !== 'granted') { Alert.alert('Permesso negato'); return; }
          await Notifications.scheduleNotificationAsync({
            content: { title: '✈️ Test AeroStaff', body: 'Notifica funzionante!', sound: true },
            trigger: null,
          });
          Alert.alert('Inviata!', 'Controlla la barra delle notifiche');
        }}
      >
        <Text style={styles.testBtnTxt}>🔔 Invia notifica test</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
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
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2, overflow: 'hidden',
  },
  divider: { height: 1, marginLeft: 56 },
  row:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  iconWrap:{ width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  rowText: { flex: 1 },
  rowLabel:{ fontSize: 14, fontWeight: '600' },
  rowSub:  { fontSize: 12, marginTop: 1 },
  testBtn: { borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 12 },
  testBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
