import { version } from '../../package.json';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Animated, Modal, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Easing } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme, type ThemeColors } from '../context/ThemeContext';
import AeroStaffLogo from './AeroStaffLogo';
import LiquidGlassSurface from './LiquidGlassSurface';
import { useLanguage } from '../context/LanguageContext';

type DrawerItem = {
  id: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  sublabel: string;
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
}

const DRAWER_WIDTH = 285;

export default function DrawerMenu({ visible, onClose, onSelect }: Props) {
  const { colors } = useAppTheme();
  const { t } = useLanguage();
  const ITEMS: DrawerItem[] = [
    { id: 'Notepad',   icon: 'edit-note',  label: t('drawerNotepadTitle'),  sublabel: t('drawerNotepadSub') },
    { id: 'Phonebook', icon: 'contacts',   label: t('drawerPhonebookTitle'), sublabel: t('drawerPhonebookSub') },
    { id: 'Passwords', icon: 'lock',       label: t('drawerPasswordTitle'),  sublabel: t('drawerPasswordSub') },
    { id: 'Manuals',   icon: 'menu-book',  label: t('drawerManualsTitle'),   sublabel: 'Easyjet, Wizz, Ryanair…' },
    { id: 'Settings',  icon: 'settings',   label: t('drawerSettingsTitle'),  sublabel: t('drawerSettingsSub') },
  ];
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 24,
          stiffness: 185,
          mass: 0.95,
          useNativeDriver: false,
        }),
        Animated.timing(fadeAnim,  {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 260,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(fadeAnim,  {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
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
        <Animated.View style={[styles.drawerWrapper, { transform: [{ translateX: slideAnim }] }]}>
          <LiquidGlassSurface
            style={styles.blurFill}
            tintColor={colors.isDark ? '#140E0A' : '#FFFCF8'}
            glassOpacity={colors.isDark ? 0.24 : 0.14}
            blurRadius={10}
            dispersion={0.46}
            cornerRadius={0}
            refractionHeight={24}
            refractionOffset={-60}
            fallbackBlurIntensity={colors.isDark ? 56 : 44}
            fallbackBlurTint={colors.isDark ? 'dark' : 'light'}
            fallbackGradientColors={colors.isDark
              ? ['rgba(255,255,255,0.06)', 'rgba(20,14,10,0.52)']
              : ['rgba(255,255,255,0.40)', 'rgba(255,244,236,0.22)']}
          >
            {/* Orange gradient header */}
            <LinearGradient
              colors={['#C2410C', '#F97316', '#FB923C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerGradient}
            >
              <AeroStaffLogo variant="large" monochrome />
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeIconBtn}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={t('close')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons name="close" size={20} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </LinearGradient>

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
                    <MaterialIcons name={item.icon} size={22} color={colors.primary} />
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

            <Text style={styles.version}>AeroStaff Pro · v{version}</Text>
          </LiquidGlassSurface>
        </Animated.View>
      </View>
    </Modal>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, flexDirection: 'row' },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,5,0,0.55)' },
    drawerWrapper: {
      width: DRAWER_WIDTH,
      height: '100%',
      overflow: 'hidden',
      // Subtle warm glow shadow
      shadowColor: '#F97316',
      shadowOffset: { width: 6, height: 0 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 20,
    },
    blurFill: {
      ...StyleSheet.absoluteFillObject,
    },
    headerGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingTop: 56,
      paddingBottom: 22,
    },
    closeIconBtn: { padding: 6 },
    sectionLabel: {
      fontSize: 10, fontWeight: '700', color: c.textMuted,
      letterSpacing: 1.4, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8,
    },
    items: { paddingHorizontal: 10 },
    item: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 13, paddingHorizontal: 10,
      borderRadius: 16, marginBottom: 2,
    },
    itemIcon: {
      width: 42, height: 42, borderRadius: 14,
      backgroundColor: c.primaryLight,
      justifyContent: 'center', alignItems: 'center',
    },
    itemLabel: { fontSize: 14, fontWeight: '600', color: c.text },
    itemSub:   { fontSize: 11, color: c.textMuted, marginTop: 1 },
    divider:   { height: 1, backgroundColor: c.border, marginHorizontal: 18, marginTop: 16 },
    version:   { fontSize: 11, color: c.textMuted, textAlign: 'center', paddingTop: 14 },
  });
}
