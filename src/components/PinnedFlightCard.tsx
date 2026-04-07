import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { getAirlineOps, getAirlineColor } from '../utils/airlineOps';

export default function PinnedFlightCard({ item, colors }: { item: any; colors: any }) {
  const { t, locale } = useLanguage();
  const tab = item._pinTab || 'departures';
  const flightNumber = item.flight?.identification?.number?.default || 'N/A';
  const airline = item.flight?.airline?.name || 'Sconosciuta';
  const airlineColor = getAirlineColor(airline);
  const statusText = item.flight?.status?.text || 'Scheduled';
  const raw = item.flight?.status?.generic?.status?.color || 'gray';
  const statusColor = raw === 'green' ? '#10b981' : raw === 'red' ? '#ef4444' : raw === 'yellow' ? '#f59e0b' : '#6b7280';

  const dest = tab === 'arrivals'
    ? (item.flight?.airport?.origin?.code?.iata || 'N/A')
    : (item.flight?.airport?.destination?.code?.iata || 'N/A');
  const ts = tab === 'arrivals'
    ? item.flight?.time?.scheduled?.arrival
    : item.flight?.time?.scheduled?.departure;
  const depTime = ts ? new Date(ts * 1000).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : 'N/A';

  const ops = getAirlineOps(airline);
  const fmt = (offsetMin: number) =>
    ts ? new Date((ts - offsetMin * 60) * 1000).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <View style={{
      marginHorizontal: 16, marginTop: 16,
      borderRadius: 16, overflow: 'hidden',
      backgroundColor: colors.card,
      shadowColor: colors.primary, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
      borderWidth: colors.isDark ? 1 : 0, borderColor: colors.border,
    }}>
      {/* Compact header: airline color bar + flight info */}
      <View style={{
        backgroundColor: airlineColor,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 12, paddingHorizontal: 16,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>{flightNumber}</Text>
          </View>
          <View>
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>{airline}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>{tab === 'arrivals' ? t('homeArrival') : t('homeDeparture')}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 22 }}>{depTime}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' }}>{dest}</Text>
        </View>
      </View>

      {/* Body */}
      <View style={{ padding: 12 }}>
        {tab === 'departures' ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primaryLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
              <MaterialIcons name="desktop-windows" size={15} color={colors.primary} />
              <View>
                <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textSub, letterSpacing: 0.3 }}>CHECK-IN</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primaryDark }}>{fmt(ops.checkInOpen)} – {fmt(ops.checkInClose)}</Text>
              </View>
            </View>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primaryLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
              <MaterialIcons name="meeting-room" size={15} color={colors.primary} />
              <View>
                <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textSub, letterSpacing: 0.3 }}>GATE</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primaryDark }}>{fmt(ops.gateOpen)} – {fmt(ops.gateClose)}</Text>
              </View>
            </View>
          </View>
        ) : (
          <Text style={{ fontSize: 12, color: colors.textSub }}>
            Da: {item.flight?.airport?.origin?.name || item.flight?.airport?.origin?.code?.iata || 'N/A'}
          </Text>
        )}
        {/* Status row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <View style={{ backgroundColor: statusColor + '22', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: statusColor }}>{statusText}</Text>
          </View>
          <View style={{ backgroundColor: '#F59E0B22', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MaterialIcons name="push-pin" size={12} color="#F59E0B" />
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#F59E0B' }}>{t('homePinned')}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
