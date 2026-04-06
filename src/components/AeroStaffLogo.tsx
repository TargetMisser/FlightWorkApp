import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Size = 'small' | 'large';

interface Props {
  /** 'large' = icon + wordmark (drawer header); 'small' = icon only */
  variant?: Size;
  /** White-only mode for use inside orange/dark headers */
  monochrome?: boolean;
}

export default function AeroStaffLogo({ variant = 'large', monochrome = false }: Props) {
  return (
    <View style={[styles.root, variant === 'small' && styles.rootSmall]}>
      <AeroIconMark small={variant === 'small'} monochrome={monochrome} />
      {variant === 'large' && (
        <View style={styles.wordmarkWrapper}>
          <Text style={[styles.wordmarkAero, monochrome && styles.wordmarkMono]}>AERO</Text>
          <View style={styles.staffWrapper}>
            {!monochrome && (
              <LinearGradient
                colors={['#FF9A42', '#F47B16']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
            )}
            <Text style={[styles.wordmarkStaff, monochrome && styles.wordmarkMono]}>STAFF</Text>
          </View>
          <View style={[styles.proBadge, monochrome && styles.proBadgeMono]}>
            <Text style={[styles.proBadgeText, monochrome && { color: '#F47B16' }]}>PRO</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function AeroIconMark({ small, monochrome }: { small: boolean; monochrome: boolean }) {
  const S = small ? 36 : 44;
  const R = small ? 9 : 11;
  const scale = S / 44;

  const fuselageW = Math.round(22 * scale);
  const fuselageH = Math.round(4 * scale);
  const wingW     = Math.round(20 * scale);
  const wingH     = Math.round(2.5 * scale);
  const tailW     = Math.round(8 * scale);
  const tailH     = Math.round(2 * scale);

  const white  = '#FFFFFF';
  const orange = '#F47B16';
  const fg = monochrome ? orange : white;

  return (
    <View style={[iconStyles.container, { width: S, height: S, borderRadius: R }]}>
      {monochrome ? (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#FFFFFF' }]} />
      ) : (
        <LinearGradient
          colors={['#FFB060', '#F47B16', '#C2520A']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      {/* Specular highlight */}
      <LinearGradient
        colors={['rgba(255,255,255,0.38)', 'rgba(255,255,255,0.00)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      {/* Aircraft mark */}
      <View style={iconStyles.aircraft}>
        {/* Upper wing */}
        <View style={[
          iconStyles.wing,
          {
            width: wingW, height: wingH,
            backgroundColor: fg,
            transform: [{ skewX: '-18deg' }],
            marginBottom: 1,
          },
        ]} />
        {/* Fuselage */}
        <View style={[
          iconStyles.fuselage,
          { width: fuselageW, height: fuselageH, borderRadius: fuselageH / 2, backgroundColor: fg },
        ]} />
        {/* Lower wing */}
        <View style={[
          iconStyles.wing,
          {
            width: wingW, height: wingH,
            backgroundColor: fg,
            transform: [{ skewX: '18deg' }],
            marginTop: 1,
          },
        ]} />
        {/* Tail fin */}
        <View style={[
          iconStyles.tail,
          { width: tailW, height: tailH, backgroundColor: monochrome ? 'rgba(244,123,22,0.6)' : 'rgba(255,255,255,0.65)' },
        ]} />
      </View>
    </View>
  );
}

const FONT = Platform.select({ ios: undefined, android: 'Roboto', default: undefined });

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rootSmall: { gap: 0 },
  wordmarkWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordmarkAero: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: '#FFFFFF',
    fontFamily: FONT,
  },
  wordmarkMono: {
    color: '#FFFFFF',
  },
  staffWrapper: {
    overflow: 'hidden',
    borderRadius: 2,
  },
  wordmarkStaff: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: '#1C1C1E',
    fontFamily: FONT,
  },
  proBadge: {
    marginLeft: 6,
    backgroundColor: '#F47B16',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignSelf: 'center',
    marginBottom: 1,
  },
  proBadgeMono: {
    backgroundColor: '#FFFFFF',
  },
  proBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#FFFFFF',
    fontFamily: FONT,
  },
});

const iconStyles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F47B16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  aircraft: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fuselage: {
    alignSelf: 'center',
  },
  wing: {
    alignSelf: 'flex-end',
    borderRadius: 1,
  },
  tail: {
    alignSelf: 'flex-start',
    marginTop: 1,
    borderRadius: 1,
    transform: [{ skewX: '-18deg' }],
  },
});
