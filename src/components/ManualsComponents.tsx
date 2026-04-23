import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, LayoutAnimation } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme, type ThemeColors } from '../context/ThemeContext';
import { DCSCommand, ManualItem, Section } from '../utils/manualsData';

const CMD_REGEX = /(`[^`]+`)/g;

export function RichBodyText({ text, colors }: { text: string; colors: any }) {
  const parts = text.split(CMD_REGEX);
  return (
    <Text style={{ fontSize: 13, color: colors.textSub, lineHeight: 20 }}>
      {parts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          const cmd = part.slice(1, -1);
          return (
            <Text
              key={i}
              style={{
                fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
                fontSize: 12,
                fontWeight: '700',
                color: '#93C5FD',
                backgroundColor: '#1E3A5F',
                paddingHorizontal: 5,
                borderRadius: 4,
              }}
            >
              {cmd}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}

export function CommandsTab({ commands, colors }: { commands: DCSCommand[]; colors: any }) {
  const [search, setSearch] = useState('');
  const lower = search.toLowerCase();
  const filtered = lower
    ? commands.filter(c => c.cmd.toLowerCase().includes(lower) || c.desc.toLowerCase().includes(lower))
    : commands;

  const categories = [...new Set(filtered.map(c => c.category))];

  return (
    <View style={{ flex: 1 }}>
      <View style={{
        backgroundColor: colors.card, borderRadius: 8, marginBottom: 12,
        borderWidth: 1, borderColor: colors.border,
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10,
      }}>
        <MaterialIcons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={{
            flex: 1, paddingVertical: 9, paddingHorizontal: 8,
            fontSize: 13, color: colors.text,
            fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
          }}
          placeholder="Cerca comando..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialIcons name="close" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {categories.map(cat => (
        <View key={cat} style={{ marginBottom: 12 }}>
          <View style={{
            borderLeftWidth: 3, borderLeftColor: colors.primary,
            paddingLeft: 8, marginBottom: 6,
          }}>
            <Text style={{
              fontSize: 10, fontWeight: '700', color: colors.textMuted,
              letterSpacing: 1.2, textTransform: 'uppercase',
            }}>
              {cat}
            </Text>
          </View>
          {filtered.filter(c => c.category === cat).map((c, i) => (
            <View key={i} style={{
              backgroundColor: colors.card, borderRadius: 8,
              borderWidth: 1, borderColor: colors.border,
              paddingHorizontal: 12, paddingVertical: 9, marginBottom: 4,
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <Text style={{
                fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
                fontSize: 14, fontWeight: '700', color: '#93C5FD',
              }}>
                {c.cmd.split(/(\[[^\]]+\])/).map((part, j) =>
                  part.startsWith('[') ? (
                    <Text key={j} style={{ color: '#F59E0B' }}>{part}</Text>
                  ) : (
                    <Text key={j}>{part}</Text>
                  )
                )}
              </Text>
              <Text style={{ fontSize: 12, color: colors.text, flexShrink: 1, textAlign: 'right', marginLeft: 12 }}>
                {c.desc}
              </Text>
            </View>
          ))}
        </View>
      ))}

      {filtered.length === 0 && (
        <Text style={{ textAlign: 'center', marginTop: 30, color: colors.textMuted, fontSize: 13 }}>
          Nessun comando trovato
        </Text>
      )}
    </View>
  );
}

function makeItemStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrapper: {
      backgroundColor: c.card,
      borderRadius: 10,
      marginBottom: 6,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.border,
    },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      padding: 13,
    },
    title: { fontSize: 13, fontWeight: '600', color: c.text, flex: 1 },
    body: {
      paddingHorizontal: 14, paddingBottom: 14, paddingTop: 2,
      borderTopWidth: 1, borderTopColor: c.cardSecondary,
    },
  });
}

export function ManualItemRow({
  item, itemIdx, sectionIdx, airlineId, editMode, onEdit,
}: {
  item: ManualItem;
  itemIdx: number;
  sectionIdx: number;
  airlineId: string;
  editMode: boolean;
  onEdit: () => void;
}) {
  const { colors } = useAppTheme();
  const itemStyles = useMemo(() => makeItemStyles(colors), [colors]);
  const [open, setOpen] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(v => !v);
  };

  return (
    <View style={itemStyles.wrapper}>
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
      {open && (
        <View style={itemStyles.body}>
          <RichBodyText text={item.body} colors={colors} />
        </View>
      )}
    </View>
  );
}

function makeSectionStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrapper: {
      marginBottom: 12,
    },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 10, paddingHorizontal: 4,
      borderBottomWidth: 1, borderBottomColor: c.border,
      marginBottom: 8,
    },
    title: { fontSize: 12, fontWeight: '700', color: c.textSub, letterSpacing: 0.8 },
    body:  { paddingLeft: 0 },
  });
}

export function SectionBlock({
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
  const { colors } = useAppTheme();
  const sectionStyles = useMemo(() => makeSectionStyles(colors), [colors]);
  const [open, setOpen] = useState(true);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(v => !v);
  };

  return (
    <View style={sectionStyles.wrapper}>
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
      {open && (
        <View style={sectionStyles.body}>
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
        </View>
      )}
    </View>
  );
}
