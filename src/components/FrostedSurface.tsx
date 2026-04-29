import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

type FrostedSurfaceProps = ViewProps & {
  blurIntensity?: number;
  blurTint?: 'light' | 'dark';
  gradientColors?: [string, string, ...string[]];
  overlayColor?: string;
};

export default function FrostedSurface({
  children,
  blurIntensity = 80,
  blurTint = 'dark',
  gradientColors = ['rgba(10,14,22,0.66)', 'rgba(10,14,22,0.42)'],
  overlayColor = 'rgba(0,0,0,0.22)',
  style,
  ...viewProps
}: FrostedSurfaceProps) {
  return (
    <View {...viewProps} style={[styles.shell, style]}>
      <BlurView
        intensity={blurIntensity}
        tint={blurTint}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor }]}
      />
      <View pointerEvents="box-none" style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
});
