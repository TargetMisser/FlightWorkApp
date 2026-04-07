import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, Modal, Platform, KeyboardAvoidingView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme, type ThemeColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Contact, CATEGORIES, CATEGORY_COLORS, genId } from '../types/phonebook';

interface EditModalProps {
  visible: boolean;
  contact: Partial<Contact> | null;
  onSave: (c: Contact) => void;
  onClose: () => void;
}

function makeModalStyles(c: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1, justifyContent: 'flex-end',
      backgroundColor: 'rgba(15,23,42,0.5)',
    },
    scrollContent: { flexGrow: 1, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 20, paddingBottom: 36, maxHeight: '92%',
    },
    handle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: c.border,
      alignSelf: 'center', marginBottom: 18,
    },
    title: { fontSize: 18, fontWeight: '700', color: c.primaryDark, marginBottom: 16 },
    label: { fontSize: 12, fontWeight: '600', color: c.textSub, marginBottom: 6, marginTop: 12 },
    input: {
      borderWidth: 1.5, borderColor: c.border, borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 11,
      fontSize: 15, color: c.text, backgroundColor: c.cardSecondary,
    },
    catRow: { marginBottom: 4 },
    catChip: {
      paddingHorizontal: 14, paddingVertical: 7,
      borderRadius: 20, borderWidth: 1.5, borderColor: c.border,
      marginRight: 8, backgroundColor: c.card,
    },
    catTxt: { fontSize: 12, fontWeight: '600', color: c.textSub },
    actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    cancelBtn: {
      flex: 1, borderWidth: 1.5, borderColor: c.border,
      borderRadius: 12, paddingVertical: 13, alignItems: 'center',
    },
    cancelTxt: { fontSize: 14, fontWeight: '600', color: c.textSub },
    saveBtn: {
      flex: 2, backgroundColor: c.primary,
      borderRadius: 12, paddingVertical: 13,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    saveTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  });
}

export function ContactEditModal({ visible, contact, onSave, onClose }: EditModalProps) {
  const { colors } = useAppTheme();
  const { t } = useLanguage();
  const modalStyles = useMemo(() => makeModalStyles(colors), [colors]);
  const [name, setName]         = useState('');
  const [number, setNumber]     = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [note, setNote]         = useState('');

  useEffect(() => {
    if (contact) {
      setName(contact.name ?? '');
      setNumber(contact.number ?? '');
      setCategory(contact.category ?? CATEGORIES[0]);
      setNote(contact.note ?? '');
    } else {
      setName(''); setNumber(''); setCategory(CATEGORIES[0]); setNote('');
    }
  }, [contact, visible]);

  const handleSave = () => {
    if (!name.trim() || !number.trim()) {
      Alert.alert(t('contactErrReqTitle'), t('contactErrReqMsg'));
      return;
    }
    onSave({
      id: contact?.id ?? genId(),
      name: name.trim(),
      number: number.trim(),
      category,
      note: note.trim(),
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={modalStyles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <ScrollView contentContainerStyle={modalStyles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />

          <Text style={modalStyles.title}>
            {contact?.id ? t('contactModalEdit') : t('contactModalNew')}
          </Text>

          {/* Nome */}
          <Text style={modalStyles.label}>{t('contactNameLabel')}</Text>
          <TextInput
            style={modalStyles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('contactNamePh')}
            placeholderTextColor={colors.textSub}
            autoCapitalize="words"
          />

          {/* Numero */}
          <Text style={modalStyles.label}>{t('contactNumberLabel')}</Text>
          <TextInput
            style={modalStyles.input}
            value={number}
            onChangeText={setNumber}
            placeholder={t('contactNumberPh')}
            placeholderTextColor={colors.textSub}
            keyboardType="phone-pad"
          />

          {/* Categoria */}
          <Text style={modalStyles.label}>{t('contactCatLabel')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={modalStyles.catRow}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  modalStyles.catChip,
                  category === cat && { backgroundColor: CATEGORY_COLORS[cat] },
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[modalStyles.catTxt, category === cat && { color: '#fff' }]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Nota */}
          <Text style={modalStyles.label}>{t('contactNoteLabel')}</Text>
          <TextInput
            style={[modalStyles.input, { height: 70, textAlignVertical: 'top' }]}
            value={note}
            onChangeText={setNote}
            placeholder={t('contactNotePh')}
            placeholderTextColor={colors.textSub}
            multiline
          />

          {/* Azioni */}
          <View style={modalStyles.actions}>
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose}>
              <Text style={modalStyles.cancelTxt}>Annulla</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalStyles.saveBtn} onPress={handleSave}>
              <MaterialIcons name="save" size={18} color="#fff" />
              <Text style={modalStyles.saveTxt}>Salva</Text>
            </TouchableOpacity>
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
