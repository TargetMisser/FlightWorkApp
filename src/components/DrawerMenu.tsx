import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Animated, Modal, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme, ThemeColors } from '../context/ThemeContext';

type DrawerItem = {
  id: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  sublabel: string;
};

const ITEMS: DrawerItem[] = [
  { id: 'Notepad',   icon: 'edit-note',  label: 'Blocco Note',  sublabel: 'Note personali' },
  { id: 'Phonebook', icon: 'contacts',   label: 'Rubrica',      sublabel: 'Numeri utili' },
  { id: 'Passwords', icon: 'lock',       label: 'Password',     sublabel: 'Credenziali salvate' },
  { id: 'Manuals',   icon: 'menu-book',  label: 'Manuali DCS',  sublabel: 'Easyjet, Wizz, Ryanair…' },
  { id: 'Settings',  icon: 'settings',   label: 'Impostazioni', sublabel: 'Preferenze app' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
}

const DRAWER_WIDTH = 285;

export default function DrawerMenu({ visible, onClose, onSelect }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, damping: 22, stiffness: 200, useNativeDriver: false }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -DRAWER_WIDTH, duration: 220, useNativeDriver: false }),
        Animated.timing(fadeAnim,  { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) setMounted(false); });
    }
  }, [visible]);

  if (!mounted && !visible) return null;

  return (
    <Modal transparent visible={mounted} animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        {/* Overlay */}
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        </Animated.View>

        {/* Drawer */}
        <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <MaterialIcons name="flight-takeoff" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.appName}>AeroStaff Pro</Text>
              <Text style={styles.appSub}>Strumenti</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeIconBtn}>
              <MaterialIcons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Section label */}
          <Text style={styles.sectionLabel}>STRUMENTI</Text>

          {/* Menu items */}
          <View style={styles.items}>
            {ITEMS.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.item}
                onPress={() => { onSelect(item.id); onClose(); }}
                activeOpacity={0.7}
              >
                <View style={styles.itemIcon}>
                  <MaterialIcons name={item.icon} size={22} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemLabel}>{item.label}</Text>
                  <Text style={styles.itemSub}>{item.sublabel}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          <Text style={styles.version}>AeroStaff Pro · v1.0</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, flexDirection: 'row' },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.5)' },
    drawer: {
      width: DRAWER_WIDTH, backgroundColor: c.card === 'transparent' ? c.bg : c.card, height: '100%', paddingTop: 52,
      shadowColor: '#000', shadowOffset: { width: 6, height: 0 }, shadowOpacity: c.isDark ? 0 : 0.18, shadowRadius: 20, elevation: c.isDark ? 0 : 24,
    },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 18, paddingBottom: 20,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    logoCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.primary, justifyContent: 'center', alignItems: 'center' },
    appName: { fontSize: 15, fontWeight: '700', color: c.primaryDark },
    appSub:  { fontSize: 11, color: c.textMuted, marginTop: 1 },
    closeIconBtn: { padding: 6 },
    sectionLabel: { fontSize: 10, fontWeight: '700', color: c.textMuted, letterSpacing: 1.2, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
    items: { paddingHorizontal: 10 },
    item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 10, borderRadius: 14, marginBottom: 2 },
    itemIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.primaryLight, justifyContent: 'center', alignItems: 'center' },
    itemLabel: { fontSize: 14, fontWeight: '600', color: c.text },
    itemSub:   { fontSize: 11, color: c.textMuted, marginTop: 1 },
    divider:   { height: 1, backgroundColor: c.border, marginHorizontal: 18, marginTop: 16 },
    version:   { fontSize: 11, color: c.textMuted, textAlign: 'center', paddingTop: 14 },
  });
}
