import React, { useState, useMemo, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Platform, UIManager,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme, type ThemeColors } from '../context/ThemeContext';
import { Airline, ModalState, DEFAULT_AIRLINES, STORAGE_KEY } from '../utils/manualsData';
import { CommandsTab, SectionBlock } from '../components/ManualsComponents';
import { AirlineModal, SectionModal, ItemModal } from '../components/ManualsModals';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 16, paddingVertical: 13,
      backgroundColor: c.card,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: c.primaryDark },
    airlineBar: {
      backgroundColor: c.card,
      borderBottomWidth: 1, borderBottomColor: c.border,
      maxHeight: 62,
    },
    airlineBarContent: {
      paddingHorizontal: 12, paddingVertical: 10, gap: 8,
    },
    airlineChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 14, paddingVertical: 7,
      borderRadius: 20, borderWidth: 1.5, borderColor: c.border,
      backgroundColor: c.card,
    },
    airlineCode: { fontSize: 11, fontWeight: '800', color: c.textSub },
    airlineName: { fontSize: 12, fontWeight: '600', color: c.textSub },
    content:    { flex: 1 },
    contentPad: { padding: 14, paddingBottom: 80 },
    banner: {
      borderRadius: 14, padding: 18, marginBottom: 18,
    },
    bannerCode: { fontSize: 28, fontWeight: '900', letterSpacing: 1 },
    bannerName: { fontSize: 15, fontWeight: '600', marginTop: 2 },
    bannerSub:  { fontSize: 12, marginTop: 4 },
    addBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingVertical: 10, paddingHorizontal: 12,
      borderWidth: 1, borderStyle: 'dashed', borderRadius: 8,
      marginBottom: 8,
    },
    addBtnText: { fontSize: 13, fontWeight: '600' },
  });
}

export default function ManualsScreen() {
  const { colors } = useAppTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [airlines, setAirlines] = useState<Airline[]>(DEFAULT_AIRLINES);
  const [selectedAirline, setSelectedAirline] = useState(DEFAULT_AIRLINES[0].id);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const parsed: Airline[] = JSON.parse(raw);
          if (parsed.length > 0) {
            setAirlines(parsed);
            setSelectedAirline(parsed[0].id);
          }
        } catch {
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_AIRLINES));
        }
      } else {
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_AIRLINES));
      }
    });
  }, []);

  const persist = (updated: Airline[]) => {
    setAirlines(updated);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'guides' | 'commands'>('guides');
  const [modal, setModal] = useState<ModalState>({ kind: 'none' });
  const closeModal = () => setModal({ kind: 'none' });

  const airline = airlines.find(a => a.id === selectedAirline) ?? airlines[0];

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <MaterialIcons name="menu-book" size={22} color={colors.primary} />
        <Text style={s.headerTitle}>Manuali DCS</Text>
        <TouchableOpacity onPress={() => setEditMode(v => !v)} style={{ marginLeft: 'auto' }}>
          <MaterialIcons
            name="edit"
            size={20}
            color={editMode ? colors.primary : colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* Airline selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.airlineBar}
        contentContainerStyle={s.airlineBarContent}
      >
        {airlines.map(a => {
          const active = a.id === selectedAirline;
          return (
            <TouchableOpacity
              key={a.id}
              style={[
                s.airlineChip,
                active && { backgroundColor: a.color, borderColor: a.color },
              ]}
              onPress={() => { setSelectedAirline(a.id); setActiveTab('guides'); }}
              onLongPress={editMode ? () => setModal({ kind: 'airline_edit', airlineId: a.id }) : undefined}
              activeOpacity={0.8}
            >
              <Text style={[s.airlineCode, active && { color: a.textColor }]}>
                {a.code}
              </Text>
              <Text style={[s.airlineName, active && { color: a.textColor }]}>
                {a.name}
              </Text>
            </TouchableOpacity>
          );
        })}
        {editMode && (
          <TouchableOpacity
            style={[s.airlineChip, { borderStyle: 'dashed' }]}
            onPress={() => setModal({ kind: 'airline_add' })}
            activeOpacity={0.8}
          >
            <MaterialIcons name="add" size={16} color={colors.textSub} />
            <Text style={s.airlineName}>Aggiungi</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Content */}
      <ScrollView
        style={s.content}
        contentContainerStyle={s.contentPad}
        showsVerticalScrollIndicator={false}
      >
        {/* Airline banner */}
        <View style={[s.banner, { backgroundColor: airline.color }]}>
          <Text style={[s.bannerCode, { color: airline.textColor }]}>{airline.code}</Text>
          <Text style={[s.bannerName, { color: airline.textColor, opacity: 0.85 }]}>{airline.name}</Text>
          <Text style={[s.bannerSub, { color: airline.textColor, opacity: 0.7 }]}>
            {airline.sections.length} sezioni · {airline.sections.reduce((n, s) => n + s.items.length, 0)} argomenti
            {airline.commands ? ` · ${airline.commands.length} comandi` : ''}
          </Text>
        </View>

        {/* Tab bar (only if airline has commands) */}
        {airline.commands && airline.commands.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 14 }}>
            {(['guides', 'commands'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{
                  paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8,
                  backgroundColor: activeTab === tab ? colors.primary : 'transparent',
                  borderWidth: activeTab === tab ? 0 : 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{
                  fontSize: 12, fontWeight: activeTab === tab ? '700' : '600',
                  color: activeTab === tab ? '#fff' : colors.textSub,
                }}>
                  {tab === 'guides' ? 'Guide' : 'Comandi'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Content based on active tab */}
        {activeTab === 'commands' && airline.commands && airline.commands.length > 0 ? (
          <CommandsTab commands={airline.commands} colors={colors} />
        ) : (
          <>
            {/* Sections */}
            {airline.sections.map((section, i) => (
              <SectionBlock
                key={i}
                section={section}
                sectionIdx={i}
                airlineId={airline.id}
                editMode={editMode}
                onEdit={() => setModal({ kind: 'section_edit', airlineId: airline.id, sectionIdx: i })}
                onAddItem={() => setModal({ kind: 'item_add', airlineId: airline.id, sectionIdx: i })}
                onEditItem={(itemIdx) => setModal({ kind: 'item_edit', airlineId: airline.id, sectionIdx: i, itemIdx })}
              />
            ))}
            {editMode && (
              <TouchableOpacity
                style={[s.addBtn, { borderColor: colors.border }]}
                onPress={() => setModal({ kind: 'section_add', airlineId: airline.id })}
              >
                <MaterialIcons name="add" size={16} color={colors.textSub} />
                <Text style={[s.addBtnText, { color: colors.textSub }]}>Aggiungi sezione</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {(modal.kind === 'airline_add' || modal.kind === 'airline_edit') && (
        <AirlineModal modal={modal} airlines={airlines} persist={persist} closeModal={closeModal} />
      )}
      {(modal.kind === 'section_add' || modal.kind === 'section_edit') && (
        <SectionModal modal={modal} airlines={airlines} persist={persist} closeModal={closeModal} />
      )}
      {(modal.kind === 'item_add' || modal.kind === 'item_edit') && (
        <ItemModal modal={modal} airlines={airlines} persist={persist} closeModal={closeModal} />
      )}
    </View>
  );
}
