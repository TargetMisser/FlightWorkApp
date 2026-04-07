import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme, type ThemeColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Contact, CATEGORY_COLORS } from '../types/phonebook';

function makeRowStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: 14, padding: 14, marginBottom: 10,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: c.isDark ? 0 : 0.05, shadowRadius: 4, elevation: c.isDark ? 0 : 2, borderWidth: c.isDark ? 1 : 0, borderColor: c.border,
    },
    dot: { width: 4, borderRadius: 2, alignSelf: 'stretch', marginRight: 12 },
    info: { flex: 1 },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
    name:   { fontSize: 14, fontWeight: '700', color: c.text, flex: 1 },
    badge: {
      paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
    },
    badgeTxt: { fontSize: 10, fontWeight: '700' },
    number: { fontSize: 13, color: c.textSub, fontWeight: '500' },
    note:   { fontSize: 11, color: c.textMuted, marginTop: 2 },
    callBtn: {
      width: 36, height: 36, borderRadius: 18,
      justifyContent: 'center', alignItems: 'center', marginLeft: 8,
    },
    editBtn: { padding: 6, marginLeft: 2 },
  });
}

interface ContactRowProps {
  contact: Contact;
  onEdit: (c: Contact) => void;
  onDelete: (id: string) => void;
}

export function ContactRow({ contact, onEdit, onDelete }: ContactRowProps) {
  const { colors } = useAppTheme();
  const { t } = useLanguage();
  const rowStyles = useMemo(() => makeRowStyles(colors), [colors]);
  const color = CATEGORY_COLORS[contact.category] ?? '#64748B';

  const call = () => {
    const url = `tel:${contact.number.replace(/\s/g, '')}`;
    Linking.canOpenURL(url).then(ok => {
      if (ok) Linking.openURL(url);
    });
  };

  const confirmDelete = () => {
    Alert.alert(t('contactDeleteTitle'), `${t('contactDeleteTitle')} "${contact.name}"?`, [
      { text: 'Annulla', style: 'cancel' },
      { text: t('contactDeleteConfirm'), style: 'destructive', onPress: () => onDelete(contact.id) },
    ]);
  };

  return (
    <View style={rowStyles.card}>
      <View style={[rowStyles.dot, { backgroundColor: color }]} />
      <View style={rowStyles.info}>
        <View style={rowStyles.topRow}>
          <Text style={rowStyles.name} numberOfLines={1}>{contact.name}</Text>
          <View style={[rowStyles.badge, { backgroundColor: color + '20' }]}>
            <Text style={[rowStyles.badgeTxt, { color }]}>{contact.category}</Text>
          </View>
        </View>
        <Text style={rowStyles.number} numberOfLines={1}>{contact.number}</Text>
        {!!contact.note && <Text style={rowStyles.note}>{contact.note}</Text>}
      </View>
      <TouchableOpacity style={[rowStyles.callBtn, { backgroundColor: color }]} onPress={call}>
        <MaterialIcons name="call" size={18} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={rowStyles.editBtn} onPress={() => onEdit(contact)}>
        <MaterialIcons name="edit" size={18} color={colors.textSub} />
      </TouchableOpacity>
      <TouchableOpacity style={rowStyles.editBtn} onPress={confirmDelete}>
        <MaterialIcons name="delete-outline" size={18} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );
}
