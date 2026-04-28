import React from 'react';
import {
  StyleSheet,
  View,
  type ViewProps,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

type LiquidGlassSurfaceProps = ViewProps & {
  cornerRadius?: number;
  refractionHeight?: number;
  refractionOffset?: number;
  tintColor?: string;
  glassOpacity?: number;
  dispersion?: number;
  blurRadius?: number;
  fallbackBlurIntensity?: number;
  fallbackBlurTint?: 'light' | 'dark';
  fallbackGradientColors?: [string, string, ...string[]];
};

export default function LiquidGlassSurface({
  children,
  cornerRadius,
  refractionHeight,
  refractionOffset,
  tintColor,
  glassOpacity,
  dispersion,
  blurRadius,
  fallbackBlurIntensity = 70,
  fallbackBlurTint = 'light',
  fallbackGradientColors = ['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.06)'],
  style,
  ...viewProps
}: LiquidGlassSurfaceProps) {
  void cornerRadius;
  void refractionHeight;
  void refractionOffset;
  void tintColor;
  void glassOpacity;
  void dispersion;
  void blurRadius;

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
