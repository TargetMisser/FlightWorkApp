import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar, PanResponder, Animated, Dimensions, BackHandler } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';
import { AirportProvider } from './src/context/AirportContext';
import HomeScreen from './src/screens/HomeScreen';
import TraveldocScreen from './src/screens/TraveldocScreen';
import FlightScreen from './src/screens/FlightScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import NotepadScreen from './src/screens/NotepadScreen';
import ManualsScreen from './src/screens/ManualsScreen';
import PhonebookScreen from './src/screens/PhonebookScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import PasswordScreen from './src/screens/PasswordScreen';
import DrawerMenu from './src/components/DrawerMenu';
import { autoScheduleNotifications } from './src/utils/autoNotifications';

type Tab = 'Shifts' | 'Calendar' | 'Flights' | 'TravelDoc';
type OverlayScreen = 'Notepad' | 'Phonebook' | 'Passwords' | 'Manuals' | 'Settings' | null;

const TABS: { id: Tab; icon: keyof typeof MaterialIcons.glyphMap; label: string }[] = [
  { id: 'Shifts',    icon: 'home',           label: 'Home'     },
  { id: 'Calendar', icon: 'table-rows',      label: 'Turni'    },
  { id: 'Flights',  icon: 'flight-takeoff',  label: 'Voli'     },
  { id: 'TravelDoc',icon: 'description',     label: 'TravelDoc'},
];

const OVERLAY_TITLES: Record<NonNullable<OverlayScreen>, string> = {
  Notepad:   'Blocco Note',
  Phonebook: 'Rubrica',
  Passwords: 'Password',
  Manuals:   'Manuali DCS',
  Settings:  'Impostazioni',
};

// ─── Animated glassmorphic tab ───────────────────────────────────────────────
function GlassTab({ icon, label, focused, activeColor, inactiveColor, onPress }: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  focused: boolean;
  activeColor: string;
  inactiveColor: string;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(focused ? 1.15 : 1)).current;
  const translateY = useRef(new Animated.Value(focused ? -4 : 0)).current;
  const opacity = useRef(new Animated.Value(focused ? 1 : 0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: focused ? 1.15 : 1, useNativeDriver: true, tension: 200, friction: 15 }),
      Animated.spring(translateY, { toValue: focused ? -4 : 0, useNativeDriver: true, tension: 200, friction: 15 }),
      Animated.timing(opacity, { toValue: focused ? 1 : 0.5, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [focused]);

  return (
    <TouchableOpacity onPress={onPress} style={styles.glassTab} activeOpacity={0.7}>
      <Animated.View style={{ transform: [{ scale }, { translateY }], alignItems: 'center' }}>
        <MaterialIcons name={icon} size={22} color={focused ? activeColor : inactiveColor} />
      </Animated.View>
      <Animated.Text style={[
        styles.glassLabel,
        { color: focused ? activeColor : inactiveColor, opacity, transform: [{ translateY }] },
        focused && { fontWeight: '700' },
      ]}>
        {label}
      </Animated.Text>
      {focused && <View style={[styles.glassIndicator, { backgroundColor: activeColor }]} />}
    </TouchableOpacity>
  );
}

// ─── Inner app (inside ThemeProvider) ────────────────────────────────────────
function AppInner() {
  const { colors, mode } = useAppTheme();
  const [activeTab, setActiveTab]   = useState<Tab>('Shifts');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [overlay, setOverlay]       = useState<OverlayScreen>(null);

  const handleDrawerSelect = (id: string) => setOverlay(id as OverlayScreen);
  const handleBack = () => setOverlay(null);

  // ─── Auto-schedule flight notifications on startup ─────────────────────────
  useEffect(() => {
    autoScheduleNotifications().catch(() => {});
  }, []);

  // ─── Android back button: overlay → home, drawer → close ───────────────────
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (drawerOpen) { setDrawerOpen(false); return true; }
      if (overlay) { setOverlay(null); return true; }
      return false; // default behaviour (exit app) solo dalla home
    });
    return () => sub.remove();
  }, [drawerOpen, overlay]);

  // ─── Swipe con drag live tra tab ─────────────────────────────────────────────
  const SCREEN_W = Dimensions.get('window').width;
  const offsetX = useRef(new Animated.Value(0)).current;
  const activeIdxRef = useRef(0);
  const overlayRef = useRef(overlay);
  overlayRef.current = overlay;

  const goToTab = (newIdx: number) => {
    activeIdxRef.current = newIdx;
    offsetX.setValue(-newIdx * SCREEN_W);
    setActiveTab(TABS[newIdx].id);
  };

  const swipePan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > 30 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
    onPanResponderMove: (_, g) => {
      if (overlayRef.current) return;
      const idx = activeIdxRef.current;
      const base = -idx * SCREEN_W;
      if (g.dx > 0 && idx === 0) return offsetX.setValue(base);
      if (g.dx < 0 && idx === TABS.length - 1) return offsetX.setValue(base);
      offsetX.setValue(base + g.dx);
    },
    onPanResponderRelease: (_, g) => {
      if (overlayRef.current) return;
      const idx = activeIdxRef.current;
      const threshold = SCREEN_W * 0.25;

      if (g.dx < -threshold && idx < TABS.length - 1) {
        Animated.timing(offsetX, {
          toValue: -(idx + 1) * SCREEN_W, duration: 150, useNativeDriver: true,
        }).start(() => goToTab(idx + 1));
      } else if (g.dx > threshold && idx > 0) {
        Animated.timing(offsetX, {
          toValue: -(idx - 1) * SCREEN_W, duration: 150, useNativeDriver: true,
        }).start(() => goToTab(idx - 1));
      } else {
        Animated.spring(offsetX, {
          toValue: -idx * SCREEN_W, useNativeDriver: true, tension: 120, friction: 10,
        }).start();
      }
    },
  }), [offsetX, SCREEN_W]);

  const renderOverlay = () => {
    if (overlay === 'Notepad')   return <NotepadScreen />;
    if (overlay === 'Phonebook') return <PhonebookScreen />;
    if (overlay === 'Passwords') return <PasswordScreen />;
    if (overlay === 'Manuals')   return <ManualsScreen />;
    if (overlay === 'Settings')  return <SettingsScreen />;
    return null;
  };

  const renderTabScreen = (tab: Tab) => {
    switch (tab) {
      case 'Shifts':    return <HomeScreen />;
      case 'Calendar':  return <CalendarScreen />;
      case 'Flights':   return <FlightScreen />;
      case 'TravelDoc': return <TraveldocScreen />;
    }
  };


  const appBarTitle = overlay ? OVERLAY_TITLES[overlay] : 'AeroStaff Pro';
  const isWeather   = mode === 'weather' && !!colors.gradient;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: StatusBar.currentHeight || 48 }]}>
      <StatusBar
        barStyle={colors.statusBar}
        backgroundColor={colors.appBar}
      />

      {/* Top App Bar */}
      <View style={[styles.appBar, { backgroundColor: colors.appBar, borderBottomColor: colors.border }]}>
        {overlay ? (
          <TouchableOpacity onPress={handleBack} style={styles.iconBtn}>
            <MaterialIcons name="arrow-back" size={22} color={colors.primaryDark} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setDrawerOpen(true)} style={styles.iconBtn}>
            <MaterialIcons name="menu" size={24} color={colors.primaryDark} />
          </TouchableOpacity>
        )}
        <View style={styles.titleRow}>
          <Text style={[styles.appBarTitle, { color: colors.primaryDark }]}>{appBarTitle}</Text>
          {isWeather && (
            <Text style={styles.weatherChip}>{colors.weatherIcon} {colors.weatherLabel}</Text>
          )}
        </View>
        <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.avatarText, { color: colors.primaryDark }]}>MR</Text>
        </View>
      </View>

      {/* Screen Content */}
      {isWeather ? (
        <LinearGradient
          colors={colors.gradient as [string, string, ...string[]]}
          style={styles.content}
          >
          {overlay ? renderOverlay() : TABS.map((tab, i) => (
            <Animated.View
              key={tab.id}
              style={[StyleSheet.absoluteFill, { transform: [{ translateX: Animated.add(offsetX, i * SCREEN_W) }] }]}
            >
              {renderTabScreen(tab.id)}
            </Animated.View>
          ))}
        </LinearGradient>
      ) : (
        <View style={[styles.content, { backgroundColor: colors.bg, overflow: 'hidden' }]}>
          {overlay ? renderOverlay() : TABS.map((tab, i) => (
            <Animated.View
              key={tab.id}
              style={[StyleSheet.absoluteFill, { transform: [{ translateX: Animated.add(offsetX, i * SCREEN_W) }] }]}
            >
              {renderTabScreen(tab.id)}
            </Animated.View>
          ))}
        </View>
      )}

      {/* Bottom Nav — Glassmorphic Floating Pill (hidden on overlay screens) */}
      {!overlay && (
        <View style={styles.tabBarWrapper} {...swipePan.panHandlers}>
          <BlurView intensity={80} tint={colors.isDark ? 'dark' : 'light'} style={styles.tabBarBlur}>
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <GlassTab
                  key={tab.id}
                  icon={tab.icon}
                  label={tab.label}
                  focused={active}
                  activeColor={colors.primary}
                  inactiveColor={colors.isDark ? '#94A3B8' : '#64748B'}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    goToTab(TABS.findIndex(t => t.id === tab.id));
                  }}
                />
              );
            })}
          </BlurView>
        </View>
      )}

      {/* Drawer */}
      <DrawerMenu
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSelect={handleDrawerSelect}
      />
    </View>
  );
}

// ─── Root export con ThemeProvider ───────────────────────────────────────────
export default function App() {
  return (
    <ThemeProvider>
      <AirportProvider>
        <AppInner />
      </AirportProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 0,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  iconBtn: { padding: 6, borderRadius: 8, marginRight: 6 },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  appBarTitle: { fontSize: 18, fontWeight: 'bold', letterSpacing: 0.3 },
  weatherChip: {
    fontSize: 11, color: 'rgba(255,255,255,0.8)',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20,
  },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 12, fontWeight: 'bold' },
  content: { flex: 1 },
  // ─── Glassmorphic floating tab bar ───
  tabBarWrapper: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  tabBarBlur: {
    flexDirection: 'row',
    height: 64,
    borderRadius: 32,
    justifyContent: 'space-around',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  glassTab: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 54,
  },
  glassLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
    letterSpacing: 0.3,
  },
  glassIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 20,
    height: 3,
    borderRadius: 999,
  },
});
