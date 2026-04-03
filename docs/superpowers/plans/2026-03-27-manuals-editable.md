# Manuali DCS Editabili — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere CRUD completo (compagnie, sezioni, voci) con persistenza AsyncStorage in ManualsScreen.

**Architecture:** Tutto in `ManualsScreen.tsx`. Lo state `airlines` viene caricato da AsyncStorage al mount (fallback ai dati hardcoded). Ogni mutazione aggiorna lo state e persiste immediatamente. I modal vengono gestiti con un singolo state `modalState` discriminato per tipo (`airline | section | item`).

**Tech Stack:** React Native, AsyncStorage (`@react-native-async-storage/async-storage`), Modal RN, Alert RN.

---

### Task 1: Migrazione dati → AsyncStorage

**Files:**
- Modify: `src/screens/ManualsScreen.tsx`

- [ ] **Step 1: Aggiungere import AsyncStorage**

In cima al file, dopo gli import esistenti:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
```

- [ ] **Step 2: Aggiungere costante chiave storage**

Subito dopo gli import, prima di `const GOLD`:

```typescript
const STORAGE_KEY = 'manuals_data';
```

- [ ] **Step 3: Convertire AIRLINES da costante a default**

Rinominare `AIRLINES` in `DEFAULT_AIRLINES` (replace_all: true nel file):

```typescript
const DEFAULT_AIRLINES: Airline[] = [
  // ... tutto il contenuto invariato ...
];
```

- [ ] **Step 4: Aggiungere state e caricamento in ManualsScreen**

Nel componente `ManualsScreen`, sostituire:

```typescript
const [selectedAirline, setSelectedAirline] = useState(AIRLINES[0].id);
const airline = AIRLINES.find(a => a.id === selectedAirline) ?? AIRLINES[0];
```

con:

```typescript
const [airlines, setAirlines] = useState<Airline[]>(DEFAULT_AIRLINES);
const [loaded, setLoaded] = useState(false);
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
      } catch {}
    } else {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_AIRLINES));
    }
    setLoaded(true);
  });
}, []);
```

Aggiungere `useEffect` agli import React:
```typescript
import React, { useState, useMemo, useEffect } from 'react';
```

- [ ] **Step 5: Aggiungere funzione persist e aggiornare `airline`**

Subito dopo i `useState`, aggiungere:

```typescript
const persist = (updated: Airline[]) => {
  setAirlines(updated);
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

const airline = airlines.find(a => a.id === selectedAirline) ?? airlines[0];
```

- [ ] **Step 6: Aggiornare i riferimenti a AIRLINES nel JSX**

Nel JSX di `ManualsScreen`, sostituire tutti i `AIRLINES` con `airlines`:
- `AIRLINES.map(a => { ... })` → `airlines.map(a => { ... })`

- [ ] **Step 7: Verificare che l'app carichi e mostri i dati**

Ricaricare l'app via Metro. La schermata Manuali deve funzionare identicamente a prima.

- [ ] **Step 8: Commit**

```bash
git add src/screens/ManualsScreen.tsx
git commit -m "feat: migrate manuals data to AsyncStorage"
```

---

### Task 2: Edit mode toggle

**Files:**
- Modify: `src/screens/ManualsScreen.tsx`

- [ ] **Step 1: Aggiungere state editMode**

Dopo `const [loaded, setLoaded] = useState(false);`:

```typescript
const [editMode, setEditMode] = useState(false);
```

- [ ] **Step 2: Aggiungere icona ✏️ nell'header**

Sostituire il blocco header nel JSX:

```tsx
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
```

- [ ] **Step 3: Verificare visivamente**

Ricaricare l'app. L'icona ✏️ appare nell'header. Toccandola cambia colore (primary = edit mode attivo, textMuted = inattivo).

- [ ] **Step 4: Commit**

```bash
git add src/screens/ManualsScreen.tsx
git commit -m "feat: add edit mode toggle to manuals header"
```

---

### Task 3: Modal state e tipi

**Files:**
- Modify: `src/screens/ManualsScreen.tsx`

- [ ] **Step 1: Aggiungere i tipi per il modal state**

Subito dopo i tipi esistenti (`ManualItem`, `Section`, `Airline`):

```typescript
type ModalState =
  | { kind: 'none' }
  | { kind: 'airline_add' }
  | { kind: 'airline_edit'; airlineId: string }
  | { kind: 'section_add'; airlineId: string }
  | { kind: 'section_edit'; airlineId: string; sectionIdx: number }
  | { kind: 'item_add'; airlineId: string; sectionIdx: number }
  | { kind: 'item_edit'; airlineId: string; sectionIdx: number; itemIdx: number };
```

- [ ] **Step 2: Aggiungere state modal in ManualsScreen**

Dopo `const [editMode, setEditMode] = useState(false);`:

```typescript
const [modal, setModal] = useState<ModalState>({ kind: 'none' });
const closeModal = () => setModal({ kind: 'none' });
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/ManualsScreen.tsx
git commit -m "feat: add modal state types for manuals CRUD"
```

---

### Task 4: Modal Compagnia (add/edit/delete)

**Files:**
- Modify: `src/screens/ManualsScreen.tsx`

- [ ] **Step 1: Aggiungere palette colori**

Subito dopo `const STORAGE_KEY`:

```typescript
const AIRLINE_COLORS = [
  { color: '#FF6600', textColor: '#fff' },  // easyJet orange
  { color: '#C01380', textColor: '#fff' },  // Wizz pink
  { color: '#003580', textColor: '#fff' },  // Ryanair blue
  { color: '#F7C800', textColor: '#1a1a1a' }, // Vueling yellow
  { color: '#006DBF', textColor: '#fff' },  // blue
  { color: '#2E7D32', textColor: '#fff' },  // green
  { color: '#B71C1C', textColor: '#fff' },  // red
  { color: '#4A148C', textColor: '#fff' },  // purple
  { color: '#E65100', textColor: '#fff' },  // deep orange
  { color: '#37474F', textColor: '#fff' },  // grey
];
```

- [ ] **Step 2: Creare il componente AirlineModal**

Aggiungere prima del componente `ManualsScreen`:

```tsx
function AirlineModal({
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
    return AIRLINE_COLORS.findIndex(c => c.color === existing.color) ?? 0;
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={closeModal}>
      <View style={modalStyles.overlay}>
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
      </View>
    </Modal>
  );
}
```

- [ ] **Step 3: Aggiungere `modalStyles` e `TextInput` agli import**

Aggiungere `TextInput, Modal, Alert` agli import React Native (se non già presenti):

```typescript
import { View, Text, StyleSheet, TouchableOpacity, ScrollView,
  LayoutAnimation, Platform, UIManager, TextInput, Modal, Alert } from 'react-native';
```

Aggiungere subito prima di `makeStyles`:

```typescript
const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  title: { fontSize: 17, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
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
```

- [ ] **Step 4: Rendere il chip `+` e pressione lunga visibili in edit mode**

Nella chip bar del JSX, aggiungere dopo `{airlines.map(...)}`:

```tsx
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
```

Sulla `TouchableOpacity` del chip esistente, aggiungere `onLongPress`:

```tsx
onLongPress={editMode ? () => setModal({ kind: 'airline_edit', airlineId: a.id }) : undefined}
```

- [ ] **Step 5: Aggiungere AirlineModal nel render condizionalmente**

Subito prima del `</View>` di chiusura del componente `ManualsScreen`. Il rendering condizionale garantisce che il componente si rimonta ogni volta che il modal si apre, evitando stato stale:

```tsx
{(modal.kind === 'airline_add' || modal.kind === 'airline_edit') && (
  <AirlineModal modal={modal} airlines={airlines} persist={persist} closeModal={closeModal} />
)}
```

- [ ] **Step 6: Testare add e edit compagnia**

Ricaricare l'app. In edit mode:
- Toccare `+ Aggiungi` → si apre il modal, compilare nome/codice/colore → Salva → il chip appare nella bar.
- Pressione lunga su chip esistente → si apre modal modifica.
- Eliminare con conferma.

- [ ] **Step 7: Commit**

```bash
git add src/screens/ManualsScreen.tsx
git commit -m "feat: add airline add/edit/delete modal"
```

---

### Task 5: Modal Sezione (add/edit/delete)

**Files:**
- Modify: `src/screens/ManualsScreen.tsx`

- [ ] **Step 1: Creare SectionModal**

Aggiungere dopo `AirlineModal`:

```tsx
function SectionModal({
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={closeModal}>
      <View style={modalStyles.overlay}>
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
      </View>
    </Modal>
  );
}
```

- [ ] **Step 2: Modificare SectionBlock per ricevere editMode e callback**

Aggiornare la firma di `SectionBlock`:

```tsx
function SectionBlock({
  section, sectionIdx, airlineId, editMode, onEdit,
}: {
  section: Section;
  sectionIdx: number;
  airlineId: string;
  editMode: boolean;
  onEdit: () => void;
}) {
```

Nell'header della sezione, aggiungere l'icona ✏️ accanto al titolo:

```tsx
<TouchableOpacity style={sectionStyles.header} onPress={toggle} activeOpacity={0.8}>
  <Text style={sectionStyles.title}>{section.title}</Text>
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    {editMode && (
      <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <MaterialIcons name="edit" size={16} color={colors.textMuted} />
      </TouchableOpacity>
    )}
    <MaterialIcons name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={20} color={colors.textSub} />
  </View>
</TouchableOpacity>
```

- [ ] **Step 3: Aggiornare le chiamate a SectionBlock nel JSX**

Nel componente `ManualsScreen`, sostituire il map delle sezioni:

```tsx
{airline.sections.map((section, i) => (
  <SectionBlock
    key={i}
    section={section}
    sectionIdx={i}
    airlineId={airline.id}
    editMode={editMode}
    onEdit={() => setModal({ kind: 'section_edit', airlineId: airline.id, sectionIdx: i })}
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
```

- [ ] **Step 4: Aggiungere stili `addBtn` e `addBtnText` a `makeStyles`**

Dentro `makeStyles`, aggiungere:

```typescript
addBtn: {
  flexDirection: 'row', alignItems: 'center', gap: 6,
  paddingVertical: 10, paddingHorizontal: 12,
  borderWidth: 1, borderStyle: 'dashed', borderRadius: 8,
  marginBottom: 8,
},
addBtnText: { fontSize: 13, fontWeight: '600' },
```

- [ ] **Step 5: Aggiungere SectionModal nel render di ManualsScreen condizionalmente**

```tsx
{(modal.kind === 'section_add' || modal.kind === 'section_edit') && (
  <SectionModal modal={modal} airlines={airlines} persist={persist} closeModal={closeModal} />
)}
```

- [ ] **Step 6: Testare add e edit sezione**

Ricaricare. In edit mode:
- `+ Aggiungi sezione` → modal → Salva → la sezione appare.
- Icona ✏️ sulla sezione → modal modifica → Salva / Elimina.

- [ ] **Step 7: Commit**

```bash
git add src/screens/ManualsScreen.tsx
git commit -m "feat: add section add/edit/delete modal"
```

---

### Task 6: Modal Voce (add/edit/delete)

**Files:**
- Modify: `src/screens/ManualsScreen.tsx`

- [ ] **Step 1: Creare ItemModal**

Aggiungere dopo `SectionModal`:

```tsx
function ItemModal({
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={closeModal}>
      <View style={modalStyles.overlay}>
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
      </View>
    </Modal>
  );
}
```

- [ ] **Step 2: Aggiungere `inputMulti` a `modalStyles`**

Dentro `modalStyles`, aggiungere:

```typescript
inputMulti: { minHeight: 100, paddingTop: 9 },
```

- [ ] **Step 3: Aggiornare ManualItemRow per supportare edit mode**

Aggiornare la firma di `ManualItemRow`:

```tsx
function ManualItemRow({
  item, itemIdx, sectionIdx, airlineId, editMode, onEdit,
}: {
  item: ManualItem;
  itemIdx: number;
  sectionIdx: number;
  airlineId: string;
  editMode: boolean;
  onEdit: () => void;
}) {
```

Nell'header della riga, aggiungere l'icona ✏️:

```tsx
<TouchableOpacity style={itemStyles.header} onPress={toggle} activeOpacity={0.7}>
  <MaterialIcons
    name={open ? 'expand-less' : 'expand-more'}
    size={20}
    color={colors.textSub}
  />
  <Text style={itemStyles.title}>{item.title}</Text>
  {editMode && (
    <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <MaterialIcons name="edit" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  )}
</TouchableOpacity>
```

- [ ] **Step 4: Aggiornare SectionBlock per passare editMode e onEdit agli item**

Nel render degli item dentro `SectionBlock`, sostituire:

```tsx
{section.items.map((item, i) => (
  <ManualItemRow key={i} item={item} />
))}
```

con:

Aggiornare le props di `SectionBlock` per includere le callback item:

```tsx
function SectionBlock({
  section, sectionIdx, airlineId, editMode, onEdit, onAddItem, onEditItem,
}: {
  section: Section;
  sectionIdx: number;
  airlineId: string;
  editMode: boolean;
  onEdit: () => void;
  onAddItem: () => void;
  onEditItem: (itemIdx: number) => void;
}) {
```

Nel render degli item dentro `SectionBlock`:

```tsx
{section.items.map((item, i) => (
  <ManualItemRow
    key={i}
    item={item}
    itemIdx={i}
    sectionIdx={sectionIdx}
    airlineId={airlineId}
    editMode={editMode}
    onEdit={() => onEditItem(i)}
  />
))}
{editMode && (
  <TouchableOpacity
    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 4 }}
    onPress={onAddItem}
  >
    <MaterialIcons name="add" size={14} color={colors.textSub} />
    <Text style={{ fontSize: 12, color: colors.textSub }}>Aggiungi voce</Text>
  </TouchableOpacity>
)}
```

- [ ] **Step 5: Aggiornare il map delle sezioni in ManualsScreen**

```tsx
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
```

- [ ] **Step 6: Aggiungere ItemModal nel render di ManualsScreen condizionalmente**

```tsx
{(modal.kind === 'item_add' || modal.kind === 'item_edit') && (
  <ItemModal modal={modal} airlines={airlines} persist={persist} closeModal={closeModal} />
)}
```

- [ ] **Step 7: Testare il flusso completo**

Ricaricare. In edit mode:
- `+ Aggiungi voce` sotto una sezione → modal → Salva → la voce appare.
- Icona ✏️ su una voce → modal modifica → modifica testo → Salva.
- Elimina con conferma.
- Uscire dall'app e riaprirla: tutte le modifiche persistono.

- [ ] **Step 8: Commit finale**

```bash
git add src/screens/ManualsScreen.tsx
git commit -m "feat: add item add/edit/delete modal — manuals CRUD complete"
```
