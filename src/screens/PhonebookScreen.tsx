import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme, type ThemeColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Contact, CATEGORIES, CATEGORY_COLORS } from '../types/phonebook';
import { ContactRow } from '../components/ContactRow';
import { ContactEditModal as EditModal } from '../components/ContactEditModal';

const STORAGE_KEY = 'aerostaff_phonebook_v1';

// ─── Main Screen ──────────────────────────────────────────────────────────────
function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 16, paddingVertical: 12,
      backgroundColor: c.card,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: c.primaryDark, flex: 1 },
    addBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: c.primary, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 8,
    },
    addTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
    searchRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      margin: 12, paddingHorizontal: 14, paddingVertical: 10,
      backgroundColor: c.card, borderRadius: 14,
      borderWidth: 1.5, borderColor: c.border,
    },
    searchInput: { flex: 1, fontSize: 14, color: c.text },
    filterBar: { maxHeight: 50, backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border },
    filterContent: { paddingHorizontal: 12, paddingVertical: 9, gap: 8 },
    filterChip: {
      paddingHorizontal: 14, paddingVertical: 6,
      borderRadius: 20, borderWidth: 1.5, borderColor: c.border,
      backgroundColor: c.card,
    },
    filterChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    filterTxt: { fontSize: 12, fontWeight: '600', color: c.textSub },
    filterTxtActive: { color: '#fff' },
    list: { flex: 1 },
    listPad: { padding: 16, paddingBottom: 96 },
    groupHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      marginBottom: 8, marginTop: 6,
    },
    groupDot: { width: 8, height: 8, borderRadius: 4 },
    groupLabel: { fontSize: 11, fontWeight: '700', color: c.textSub, letterSpacing: 0.8, flex: 1 },
    groupCount: {
      fontSize: 11, fontWeight: '700', color: c.textMuted,
      backgroundColor: c.cardSecondary, borderRadius: 10,
      paddingHorizontal: 7, paddingVertical: 1,
    },
    empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: c.textSub },
    emptyHint: { fontSize: 13, color: c.textMuted, textAlign: 'center' },
  });
}

export default function PhonebookScreen() {
  const { colors } = useAppTheme();
  const { t } = useLanguage();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [contacts, setContacts]       = useState<Contact[]>([]);
  const [search, setSearch]           = useState('');
  const [filterCat, setFilterCat]     = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing]         = useState<Partial<Contact> | null>(null);

  // Load
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val) setContacts(JSON.parse(val));
    });
  }, []);

  const handleSave = useCallback((c: Contact) => {
    setContacts(prev => {
      const exists = prev.find(x => x.id === c.id);
      const next = exists
        ? prev.map(x => (x.id === c.id ? c : x))
        : [c, ...prev];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setModalVisible(false);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setContacts(prev => {
      const next = prev.filter(x => x.id !== id);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const openAdd = () => { setEditing(null); setModalVisible(true); };
  const openEdit = (c: Contact) => { setEditing(c); setModalVisible(true); };

  // Filter
  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.number.includes(q);
    const matchCat = !filterCat || c.category === filterCat;
    return matchSearch && matchCat;
  });

  const grouped = CATEGORIES.reduce<Record<string, Contact[]>>((acc, cat) => {
    const list = filtered.filter(c => c.category === cat);
    if (list.length) acc[cat] = list;
    return acc;
  }, {});

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <MaterialIcons name="contacts" size={22} color={colors.primary} />
        <Text style={s.headerTitle}>{t('phonebookTitle')}</Text>
        <TouchableOpacity style={s.addBtn} onPress={openAdd}>
          <MaterialIcons name="add" size={20} color="#fff" />
          <Text style={s.addTxt}>{t('contactAdd')}</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <MaterialIcons name="search" size={18} color={colors.textSub} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={t('contactSearch')}
          placeholderTextColor={colors.textSub}
          autoCorrect={false}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialIcons name="close" size={18} color={colors.textSub} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category filter */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={s.filterBar}
        contentContainerStyle={s.filterContent}
      >
        <TouchableOpacity
          style={[s.filterChip, !filterCat && s.filterChipActive]}
          onPress={() => setFilterCat(null)}
        >
          <Text style={[s.filterTxt, !filterCat && s.filterTxtActive]}>{t('contactAll')}</Text>
        </TouchableOpacity>
        {CATEGORIES.map(cat => {
          const active = filterCat === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[
                s.filterChip,
                active && { backgroundColor: CATEGORY_COLORS[cat], borderColor: CATEGORY_COLORS[cat] },
              ]}
              onPress={() => setFilterCat(active ? null : cat)}
            >
              <Text style={[s.filterTxt, active && { color: '#fff' }]}>{cat}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      <ScrollView style={s.list} contentContainerStyle={s.listPad} showsVerticalScrollIndicator={false}>
        {contacts.length === 0 ? (
          <View style={s.empty}>
            <MaterialIcons name="contacts" size={56} color={colors.textMuted} />
            <Text style={s.emptyTitle}>{t('contactEmptyTitle')}</Text>
            <Text style={s.emptyHint}>Tocca "Aggiungi" per inserire il primo contatto</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={s.empty}>
            <MaterialIcons name="search-off" size={48} color={colors.textMuted} />
            <Text style={s.emptyTitle}>{t('contactNoResults')}</Text>
          </View>
        ) : (
          Object.entries(grouped).map(([cat, list]) => (
            <View key={cat}>
              <View style={s.groupHeader}>
                <View style={[s.groupDot, { backgroundColor: CATEGORY_COLORS[cat] }]} />
                <Text style={s.groupLabel}>{cat.toUpperCase()}</Text>
                <Text style={s.groupCount}>{list.length}</Text>
              </View>
              {list.map(c => (
                <ContactRow key={c.id} contact={c} onEdit={openEdit} onDelete={handleDelete} />
              ))}
            </View>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Edit modal */}
      <EditModal
        visible={modalVisible}
        contact={editing}
        onSave={handleSave}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}
