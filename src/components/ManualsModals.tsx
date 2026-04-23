import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Alert, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import { Airline, ModalState, AIRLINE_COLORS } from '../utils/manualsData';

export const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  scrollContent: { flexGrow: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, maxHeight: '92%' },
  title: { fontSize: 17, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  inputMulti: { minHeight: 100, paddingTop: 9 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotSelected: { borderWidth: 3, borderColor: '#000', transform: [{ scale: 1.2 }] },
  btnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 20 },
  btn: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 8 },
  btnCancel: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ccc' },
  btnSave: {},
  btnDanger: { marginRight: 'auto', backgroundColor: '#FEE2E2' },
  btnText: { fontSize: 14, fontWeight: '600' },
  btnDangerText: { fontSize: 14, fontWeight: '600', color: '#DC2626' },
});

export function AirlineModal({
  modal, airlines, persist, closeModal,
}: {
  modal: ModalState;
  airlines: Airline[];
  persist: (a: Airline[]) => void;
  closeModal: () => void;
}) {
  const { colors } = useAppTheme();
  const isEdit = modal.kind === 'airline_edit';
  const existing = isEdit ? airlines.find(a => a.id === (modal as any).airlineId) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [code, setCode] = useState(existing?.code ?? '');
  const [colorIdx, setColorIdx] = useState(() => {
    if (!existing) return 0;
    const idx = AIRLINE_COLORS.findIndex(c => c.color === existing.color);
    return idx >= 0 ? idx : 0;
  });

  const visible = modal.kind === 'airline_add' || modal.kind === 'airline_edit';

  const save = () => {
    if (!name.trim() || !code.trim()) return;
    const chosen = AIRLINE_COLORS[colorIdx] ?? AIRLINE_COLORS[0];
    if (isEdit) {
      const updated = airlines.map(a =>
        a.id === (modal as any).airlineId
          ? { ...a, name: name.trim(), code: code.trim().toUpperCase(), color: chosen.color, textColor: chosen.textColor }
          : a
      );
      persist(updated);
    } else {
      const newAirline: Airline = {
        id: Date.now().toString(),
        name: name.trim(),
        code: code.trim().toUpperCase(),
        color: chosen.color,
        textColor: chosen.textColor,
        sections: [],
      };
      persist([...airlines, newAirline]);
    }
    closeModal();
  };

  const del = () => {
    Alert.alert(
      'Elimina compagnia',
      `Eliminare "${existing?.name}" e tutti i suoi contenuti?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina', style: 'destructive',
          onPress: () => {
            persist(airlines.filter(a => a.id !== (modal as any).airlineId));
            closeModal();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={closeModal}>
      <KeyboardAvoidingView
        style={modalStyles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <ScrollView contentContainerStyle={modalStyles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[modalStyles.sheet, { backgroundColor: colors.card === 'transparent' ? colors.bg : colors.card }]}>
          <Text style={[modalStyles.title, { color: colors.text }]}>
            {isEdit ? 'Modifica compagnia' : 'Nuova compagnia'}
          </Text>
          <Text style={[modalStyles.label, { color: colors.textSub }]}>Nome</Text>
          <TextInput
            style={[modalStyles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
            value={name} onChangeText={setName} placeholder="es. easyJet"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={[modalStyles.label, { color: colors.textSub }]}>Codice IATA</Text>
          <TextInput
            style={[modalStyles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
            value={code} onChangeText={setCode} placeholder="es. EZY"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters" maxLength={3}
          />
          <Text style={[modalStyles.label, { color: colors.textSub }]}>Colore</Text>
          <View style={modalStyles.colorRow}>
            {AIRLINE_COLORS.map((c, i) => (
              <TouchableOpacity
                key={i}
                style={[modalStyles.colorDot, { backgroundColor: c.color },
                  colorIdx === i && modalStyles.colorDotSelected]}
                onPress={() => setColorIdx(i)}
              />
            ))}
          </View>
          <View style={modalStyles.btnRow}>
            {isEdit && (
              <TouchableOpacity style={[modalStyles.btn, modalStyles.btnDanger]} onPress={del}>
                <Text style={modalStyles.btnDangerText}>Elimina</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[modalStyles.btn, modalStyles.btnCancel]} onPress={closeModal}>
              <Text style={[modalStyles.btnText, { color: colors.textSub }]}>Annulla</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[modalStyles.btn, modalStyles.btnSave, { backgroundColor: colors.primary }]} onPress={save}>
              <Text style={[modalStyles.btnText, { color: '#fff' }]}>Salva</Text>
            </TouchableOpacity>
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function SectionModal({
  modal, airlines, persist, closeModal,
}: {
  modal: ModalState;
  airlines: Airline[];
  persist: (a: Airline[]) => void;
  closeModal: () => void;
}) {
  const { colors } = useAppTheme();
  const isEdit = modal.kind === 'section_edit';
  const airlineId = (modal as any).airlineId as string | undefined;
  const sectionIdx = (modal as any).sectionIdx as number | undefined;
  const existingTitle = isEdit && airlineId !== undefined && sectionIdx !== undefined
    ? airlines.find(a => a.id === airlineId)?.sections[sectionIdx]?.title ?? ''
    : '';

  const [title, setTitle] = useState(existingTitle);
  const visible = modal.kind === 'section_add' || modal.kind === 'section_edit';

  const save = () => {
    if (!title.trim() || !airlineId) return;
    const updated = airlines.map(a => {
      if (a.id !== airlineId) return a;
      if (isEdit && sectionIdx !== undefined) {
        const sections = a.sections.map((s, i) =>
          i === sectionIdx ? { ...s, title: title.trim() } : s
        );
        return { ...a, sections };
      } else {
        return { ...a, sections: [...a.sections, { title: title.trim(), items: [] }] };
      }
    });
    persist(updated);
    closeModal();
  };

  const del = () => {
    const airline = airlines.find(a => a.id === airlineId);
    const sectionTitle = sectionIdx !== undefined ? airline?.sections[sectionIdx]?.title : '';
    Alert.alert(
      'Elimina sezione',
      `Eliminare la sezione "${sectionTitle}" e tutte le sue voci?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina', style: 'destructive',
          onPress: () => {
            const updated = airlines.map(a => {
              if (a.id !== airlineId) return a;
              return { ...a, sections: a.sections.filter((_, i) => i !== sectionIdx) };
            });
            persist(updated);
            closeModal();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={closeModal}>
      <KeyboardAvoidingView
        style={modalStyles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <ScrollView contentContainerStyle={modalStyles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[modalStyles.sheet, { backgroundColor: colors.card === 'transparent' ? colors.bg : colors.card }]}>
          <Text style={[modalStyles.title, { color: colors.text }]}>
            {isEdit ? 'Modifica sezione' : 'Nuova sezione'}
          </Text>
          <Text style={[modalStyles.label, { color: colors.textSub }]}>Titolo</Text>
          <TextInput
            style={[modalStyles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
            value={title} onChangeText={setTitle} placeholder="es. Check-in DCS"
            placeholderTextColor={colors.textMuted}
          />
          <View style={modalStyles.btnRow}>
            {isEdit && (
              <TouchableOpacity style={[modalStyles.btn, modalStyles.btnDanger]} onPress={del}>
                <Text style={modalStyles.btnDangerText}>Elimina</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[modalStyles.btn, modalStyles.btnCancel]} onPress={closeModal}>
              <Text style={[modalStyles.btnText, { color: colors.textSub }]}>Annulla</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[modalStyles.btn, modalStyles.btnSave, { backgroundColor: colors.primary }]} onPress={save}>
              <Text style={[modalStyles.btnText, { color: '#fff' }]}>Salva</Text>
            </TouchableOpacity>
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function ItemModal({
  modal, airlines, persist, closeModal,
}: {
  modal: ModalState;
  airlines: Airline[];
  persist: (a: Airline[]) => void;
  closeModal: () => void;
}) {
  const { colors } = useAppTheme();
  const isEdit = modal.kind === 'item_edit';
  const airlineId = (modal as any).airlineId as string | undefined;
  const sectionIdx = (modal as any).sectionIdx as number | undefined;
  const itemIdx = (modal as any).itemIdx as number | undefined;

  const existing = isEdit && airlineId && sectionIdx !== undefined && itemIdx !== undefined
    ? airlines.find(a => a.id === airlineId)?.sections[sectionIdx]?.items[itemIdx]
    : undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const visible = modal.kind === 'item_add' || modal.kind === 'item_edit';

  const save = () => {
    if (!title.trim() || !airlineId || sectionIdx === undefined) return;
    const updated = airlines.map(a => {
      if (a.id !== airlineId) return a;
      const sections = a.sections.map((s, si) => {
        if (si !== sectionIdx) return s;
        if (isEdit && itemIdx !== undefined) {
          const items = s.items.map((it, ii) =>
            ii === itemIdx ? { title: title.trim(), body: body.trim() } : it
          );
          return { ...s, items };
        } else {
          return { ...s, items: [...s.items, { title: title.trim(), body: body.trim() }] };
        }
      });
      return { ...a, sections };
    });
    persist(updated);
    closeModal();
  };

  const del = () => {
    Alert.alert(
      'Elimina voce',
      `Eliminare "${existing?.title}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina', style: 'destructive',
          onPress: () => {
            const updated = airlines.map(a => {
              if (a.id !== airlineId) return a;
              const sections = a.sections.map((s, si) => {
                if (si !== sectionIdx) return s;
                return { ...s, items: s.items.filter((_, ii) => ii !== itemIdx) };
              });
              return { ...a, sections };
            });
            persist(updated);
            closeModal();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={closeModal}>
      <KeyboardAvoidingView
        style={modalStyles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <ScrollView contentContainerStyle={modalStyles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[modalStyles.sheet, { backgroundColor: colors.card === 'transparent' ? colors.bg : colors.card }]}>
          <Text style={[modalStyles.title, { color: colors.text }]}>
            {isEdit ? 'Modifica voce' : 'Nuova voce'}
          </Text>
          <Text style={[modalStyles.label, { color: colors.textSub }]}>Titolo</Text>
          <TextInput
            style={[modalStyles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
            value={title} onChangeText={setTitle} placeholder="es. Apertura volo"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={[modalStyles.label, { color: colors.textSub }]}>Contenuto</Text>
          <TextInput
            style={[modalStyles.input, modalStyles.inputMulti, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
            value={body} onChangeText={setBody} placeholder="Procedura..."
            placeholderTextColor={colors.textMuted}
            multiline numberOfLines={5} textAlignVertical="top"
          />
          <View style={modalStyles.btnRow}>
            {isEdit && (
              <TouchableOpacity style={[modalStyles.btn, modalStyles.btnDanger]} onPress={del}>
                <Text style={modalStyles.btnDangerText}>Elimina</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[modalStyles.btn, modalStyles.btnCancel]} onPress={closeModal}>
              <Text style={[modalStyles.btnText, { color: colors.textSub }]}>Annulla</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[modalStyles.btn, modalStyles.btnSave, { backgroundColor: colors.primary }]} onPress={save}>
              <Text style={[modalStyles.btnText, { color: '#fff' }]}>Salva</Text>
            </TouchableOpacity>
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
