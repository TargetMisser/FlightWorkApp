import React from 'react';
import {
  Platform,
  StyleSheet,
  UIManager,
  View,
  type ColorValue,
  type ViewProps,
} from 'react-native';
import { requireNativeComponent } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { isNativeLiquidGlassEnabledAtLaunch } from '../utils/runtimeDiagnostics';

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
};

const nativeLiquidGlassEnabledAtLaunch = isNativeLiquidGlassEnabledAtLaunch();
const hasNativeLiquidGlassManager = Platform.OS === 'android'
  && !!UIManager.getViewManagerConfig?.('AeroLiquidGlassSurface');
const NativeLiquidGlassSurface = Platform.OS === 'android'
  && nativeLiquidGlassEnabledAtLaunch
  && hasNativeLiquidGlassManager
  ? requireNativeComponent<NativeLiquidGlassProps>('AeroLiquidGlassSurface')
  : null;

const supportsNativeLiquidGlass = Platform.OS === 'android'
  && typeof Platform.Version === 'number'
  && Platform.Version >= 33
  && hasNativeLiquidGlassManager
  && nativeLiquidGlassEnabledAtLaunch;

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
  if (supportsNativeLiquidGlass && NativeLiquidGlassSurface) {
    return (
      <NativeLiquidGlassSurface
        {...viewProps}
        style={style}
        cornerRadius={cornerRadius}
        refractionHeight={refractionHeight}
        refractionOffset={refractionOffset}
        tintColor={tintColor}
        glassOpacity={glassOpacity}
        dispersion={dispersion}
        blurRadius={blurRadius}
      >
        {children}
      </NativeLiquidGlassSurface>
    );
  }

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
