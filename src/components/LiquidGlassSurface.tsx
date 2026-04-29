import React from 'react';
import {
  StyleSheet,
  View,
  type ColorValue,
  type ViewProps,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

type NativeLiquidGlassProps = ViewProps & {
  cornerRadius?: number;
  refractionHeight?: number;
  refractionOffset?: number;
  tintColor?: ColorValue;
  glassOpacity?: number;
  dispersion?: number;
  blurRadius?: number;
};

type LiquidGlassSurfaceProps = NativeLiquidGlassProps & {
  fallbackBlurIntensity?: number;
  fallbackBlurTint?: 'light' | 'dark';
  fallbackGradientColors?: [string, string, ...string[]];
  fallbackOverlayColor?: string;
};

export default function LiquidGlassSurface({
  children,
  cornerRadius: _cornerRadius,
  refractionHeight: _refractionHeight,
  refractionOffset: _refractionOffset,
  tintColor: _tintColor,
  glassOpacity: _glassOpacity,
  dispersion: _dispersion,
  blurRadius: _blurRadius,
  fallbackBlurIntensity = 95,
  fallbackBlurTint = 'dark',
  fallbackGradientColors = ['rgba(10,14,22,0.66)', 'rgba(10,14,22,0.42)'],
  fallbackOverlayColor = 'rgba(0,0,0,0.22)',
  style,
  ...viewProps
}: LiquidGlassSurfaceProps) {
  return (
    <View {...viewProps} style={[styles.fallbackShell, style]}>
      <BlurView
        intensity={fallbackBlurIntensity}
        tint={fallbackBlurTint}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={fallbackGradientColors}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: fallbackOverlayColor }]}
      />
      <View pointerEvents="box-none" style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fallbackShell: {
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
});
