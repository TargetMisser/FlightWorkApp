import React, { useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Image, Animated, PanResponder } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme, type ThemeColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getAirlineOps, getAirlineColor } from '../utils/airlineOps';
import { normalizeFlightNumber, type StaffMonitorFlight } from '../utils/staffMonitor';

function LogoPill({ iataCode, airlineName, color }: { iataCode: string; airlineName: string; color: string }) {
  const [err, setErr] = useState(false);
  const uri = `https://pics.avs.io/160/60/${(iataCode || '').toUpperCase()}.png`;
  const initials = airlineName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  if (iataCode && !err) {
    return (
      <View style={{ width: 52, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
        <Image source={{ uri }} style={{ width: 44, height: 26 }} resizeMode="contain" onError={() => setErr(true)} />
      </View>
    );
  }
  return (
    <View style={{ width: 52, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color, fontWeight: '800', fontSize: 11 }}>{initials}</Text>
    </View>
  );
}

const SWIPE_THRESHOLD = 80;

function SwipeableFlightCard({
  children, isPinned, onToggle,
}: {
  children: React.ReactNode;
  isPinned: boolean;
  onToggle: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const onToggleRef = useRef(onToggle);
  onToggleRef.current = onToggle;

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > 15 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderMove: (_, g) => {
      if (g.dx < 0) translateX.setValue(g.dx);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dx < -SWIPE_THRESHOLD) {
        Animated.timing(translateX, { toValue: -SWIPE_THRESHOLD, duration: 100, useNativeDriver: true }).start(() => {
          onToggleRef.current();
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 120, friction: 10 }).start();
        });
      } else {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 120, friction: 10 }).start();
      }
    },
    onPanResponderTerminate: () => {
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    },
  }), []);

  return (
    <View style={{ marginBottom: 10 }}>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

export interface FlightCardProps {
  item: any;
  activeTab: 'arrivals' | 'departures';
  userShift: { start: number; end: number } | null | undefined;
  pinnedFlightId: string | null;
  pinFlight: (item: any) => void;
  unpinFlight: () => void;
  inboundArrivals: Record<string, number>;
  staffMonitorDeps: StaffMonitorFlight[];
  staffMonitorArrs: StaffMonitorFlight[];
}

export function FlightCard({
  item,
  activeTab,
  userShift,
  pinnedFlightId,
  pinFlight,
  unpinFlight,
  inboundArrivals,
  staffMonitorDeps,
  staffMonitorArrs
}: FlightCardProps) {
  const { colors } = useAppTheme();
  const { t, locale } = useLanguage();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const flightNumber = item.flight?.identification?.number?.default || 'N/A';
  const airline = item.flight?.airline?.name || 'Sconosciuta';
  const iataCode = item.flight?.airline?.code?.iata || '';
  const statusText = item.flight?.status?.text || 'Scheduled';
  const raw = item.flight?.status?.generic?.status?.color || 'gray';
  const statusColor = raw === 'green' ? '#10b981' : raw === 'red' ? '#ef4444' : raw === 'yellow' ? '#f59e0b' : '#6b7280';
  const originDest = activeTab === 'arrivals'
    ? (item.flight?.airport?.origin?.name || item.flight?.airport?.origin?.code?.iata || 'N/A')
    : (item.flight?.airport?.destination?.name || item.flight?.airport?.destination?.code?.iata || 'N/A');
  const ts = activeTab === 'arrivals' ? item.flight?.time?.scheduled?.arrival : item.flight?.time?.scheduled?.departure;
  const time = ts ? new Date(ts * 1000).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : 'N/A';
  const duringShift = userShift && ts && (() => {
    if (activeTab === 'arrivals') return ts >= userShift.start && ts <= userShift.end;
    const opsData = getAirlineOps(airline);
    const ciOpen = ts - opsData.checkInOpen * 60;
    const ciClose = ts - opsData.checkInClose * 60;
    const gOpen = ts - opsData.gateOpen * 60;
    const gClose = ts - opsData.gateClose * 60;
    const ciOverlap = ciOpen <= userShift.end && ciClose >= userShift.start;
    const gateOverlap = gOpen <= userShift.end && gClose >= userShift.start;
    return ciOverlap || gateOverlap;
  })();
  const color = getAirlineColor(airline);
  const ops = activeTab === 'departures' && ts ? getAirlineOps(airline) : null;
  const fmt = (offsetMin: number) =>
    ts ? new Date((ts - offsetMin * 60) * 1000).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '';
  const fmtTs = (tValue: number) =>
    new Date(tValue * 1000).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  const reg = item.flight?.aircraft?.registration;
  const inboundTs = reg ? inboundArrivals[reg] : undefined;
  const gateOpenFromInbound = activeTab === 'departures' && ts && inboundTs ? inboundTs : undefined;

  const flightId = item.flight?.identification?.number?.default || null;
  const isPinned = flightId !== null && flightId === pinnedFlightId;

  const normFn = normalizeFlightNumber(flightNumber);
  const normalizeForMatching = (str: string) => str.replace(/[\s\-_]/g, '').toUpperCase();
  const normFnStripped = normalizeForMatching(normFn);
  const smPool = activeTab === 'departures' ? staffMonitorDeps : staffMonitorArrs;
  const smFlight =
    smPool.find(sm => sm.flightNumber === normFn) ??
    smPool.find(sm => normalizeForMatching(sm.flightNumber) === normFnStripped);

  if (__DEV__ && !smFlight && smPool.length > 0) {
    console.log(`[FlightCard] No staffMonitor match for "${normFn}" (stripped: "${normFnStripped}") in ${activeTab}`);
  }

  return (
    <SwipeableFlightCard
      isPinned={isPinned}
      onToggle={() => isPinned ? unpinFlight() : pinFlight(item)}
    >
      <View style={[s.card, isPinned && s.cardPinned, { marginBottom: 0 }]}>
        {isPinned && <View style={s.pinBanner}><Text style={s.pinBannerText}>{t('flightPinned')}</Text></View>}
        <View style={[s.cardHeader, { backgroundColor: color }]}>
          <View style={s.headerLeft}>
            <LogoPill iataCode={iataCode} airlineName={airline} color={color} />
            <View>
              <Text style={s.headerFlightNum}>{flightNumber}</Text>
              <Text style={s.headerAirlineName}>{airline}</Text>
            </View>
          </View>
          <View>
            <Text style={s.headerTime}>{time}</Text>
            <Text style={s.headerDest}>{originDest}</Text>
          </View>
        </View>
        <View style={s.cardBody}>
          {activeTab === 'departures' && ops ? (
            <View style={s.opsRow}>
              <View style={s.opsBadge}>
                <MaterialIcons name="desktop-windows" size={16} color={colors.primary} />
                <View>
                  <Text style={s.opsLabel}>{t('flightCheckin')}</Text>
                  <Text style={s.opsTime}>{fmt(ops.checkInOpen)} – {fmt(ops.checkInClose)}</Text>
                </View>
              </View>
              <View style={s.opsBadge}>
                <MaterialIcons name="meeting-room" size={16} color={colors.primary} />
                <View>
                  <Text style={s.opsLabel}>{t('flightGate')}</Text>
                  <Text style={s.opsTime}>
                    {gateOpenFromInbound ? fmtTs(gateOpenFromInbound) : fmt(ops.gateOpen)} – {fmt(ops.gateClose)}
                  </Text>
                </View>
              </View>
            </View>
          ) : activeTab === 'arrivals' && ts ? (() => {
            const realDep = item.flight?.time?.real?.departure;
            const realArr = item.flight?.time?.real?.arrival;
            const estArr = item.flight?.time?.estimated?.arrival;
            const bestArr = realArr || estArr || ts;
            const delayMin = Math.round((bestArr - ts) / 60);
            const landed = !!realArr;
            const departed = !!realDep;

            const landColor = landed ? '#10B981'
              : delayMin > 20 ? '#EF4444'
              : delayMin > 5 ? '#F59E0B'
              : colors.primary;
            const landLabel = landed ? t('flightLanded') : t('flightEstimated');

            return (
              <View style={s.opsRow}>
                <View style={s.opsBadge}>
                  <MaterialIcons name="flight-takeoff" size={16} color={departed ? colors.primary : '#6B7280'} />
                  <View>
                    <Text style={s.opsLabel}>{t('flightDeparted')}</Text>
                    <Text style={[s.opsTime, !departed && { color: '#6B7280' }]}>
                      {departed ? fmtTs(realDep) : '--:--'}
                    </Text>
                  </View>
                </View>
                <View style={s.opsBadge}>
                  <MaterialIcons name="flight-land" size={16} color={landColor} />
                  <View>
                    <Text style={[s.opsLabel, { color: landColor }]}>{landLabel}</Text>
                    <Text style={[s.opsTime, { color: landColor }]}>{fmtTs(bestArr)}</Text>
                  </View>
                </View>
              </View>
            );
          })() : (
            <Text style={s.bodyInfo}>{`Da: ${originDest}`}</Text>
          )}
          {activeTab === 'arrivals' && ts ? (() => {
            const rArr = item.flight?.time?.real?.arrival;
            const eArr = item.flight?.time?.estimated?.arrival;
            const bArr = rArr || eArr || ts;
            const dMin = Math.round((bArr - ts) / 60);
            const isLanded = !!rArr;
            const dText = isLanded ? 'Atterrato' : dMin > 0 ? `+${dMin} min` : 'In orario';
            const dColor = isLanded ? '#10B981' : dMin > 20 ? '#EF4444' : dMin > 5 ? '#F59E0B' : '#10B981';
            return (
              <View style={[s.statusPill, { backgroundColor: dColor + '22' }]}>
                <Text style={[s.statusText, { color: dColor }]}>{dText}</Text>
              </View>
            );
          })() : (
            <View style={[s.statusPill, { backgroundColor: statusColor + '22' }]}>
              <Text style={[s.statusText, { color: statusColor }]}>{statusText}</Text>
            </View>
          )}
        </View>
      </View>
      {smFlight && (smFlight.stand || smFlight.checkin || smFlight.gate || smFlight.belt) && (
        <View style={s.smFooter}>
          {smFlight.stand && (
            <View style={s.smPill}>
              <MaterialIcons name="local-parking" size={11} color={colors.primary} />
              <Text style={s.smPillText}>Stand {smFlight.stand}</Text>
            </View>
          )}
          {smFlight.checkin && (
            <View style={s.smPill}>
              <MaterialIcons name="desktop-windows" size={11} color={colors.primary} />
              <Text style={s.smPillText}>{t('flightCheckin')} {smFlight.checkin}</Text>
            </View>
          )}
          {smFlight.gate && (
            <View style={s.smPill}>
              <MaterialIcons name="meeting-room" size={11} color={colors.primary} />
              <Text style={s.smPillText}>{t('flightGate')} {smFlight.gate}</Text>
            </View>
          )}
          {smFlight.belt && (
            <View style={s.smPill}>
              <MaterialIcons name="luggage" size={11} color={colors.primary} />
              <Text style={s.smPillText}>{t('flightBelt')} {smFlight.belt}</Text>
            </View>
          )}
        </View>
      )}
    </SwipeableFlightCard>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: { backgroundColor: c.card, borderRadius: 16, marginBottom: 10, overflow: 'hidden', shadowColor: c.primary, shadowOpacity: c.isDark ? 0 : 0.08, shadowRadius: 10, elevation: c.isDark ? 0 : 3, borderWidth: c.isDark ? 1 : 0, borderColor: c.glassBorder },
    cardPinned: { borderWidth: 2, borderColor: '#F59E0B' },
    pinBanner: { backgroundColor: '#F59E0B', paddingVertical: 5, paddingHorizontal: 12 },
    pinBannerText: { color: '#fff', fontWeight: 'bold', fontSize: 11, letterSpacing: 0.5 },
    statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginTop: 5 },
    statusText: { fontSize: 10, fontWeight: '700' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerFlightNum: { color: '#fff', fontWeight: '900', fontSize: 15, lineHeight: 18 },
    headerAirlineName: { color: 'rgba(255,255,255,0.8)', fontSize: 10 },
    headerTime: { color: '#fff', fontWeight: '900', fontSize: 18, lineHeight: 20, textAlign: 'right' },
    headerDest: { color: 'rgba(255,255,255,0.8)', fontSize: 10, textAlign: 'right' },
    cardBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: c.card },
    bodyInfo: { flex: 1, fontSize: 11, color: c.textSub },
    opsRow: { flex: 1, flexDirection: 'row', gap: 8 },
    opsBadge: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.primaryLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
    opsLabel: { fontSize: 10, fontWeight: '600', color: c.textSub, letterSpacing: 0.5 },
    opsTime: { fontSize: 13, fontWeight: '800', color: c.primaryDark },
    smFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, paddingBottom: 10, backgroundColor: c.card },
    smPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.primaryLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    smPillText: { fontSize: 11, fontWeight: '700', color: c.primaryDark },
  });
}
