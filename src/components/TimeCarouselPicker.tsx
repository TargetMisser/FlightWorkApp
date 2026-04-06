import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const ITEM_H = 52;
const VISIBLE = 5;
const PAD = ITEM_H * 2; // 2 invisible items top & bottom

interface WheelColumnProps {
  items: string[];
  defaultIndex: number;
  onChange: (index: number) => void;
  accentColor: string;
  textColor: string;
  mutedColor: string;
  bgColor: string;
  borderColor: string;
}

const WheelColumn: React.FC<WheelColumnProps> = ({
  items, defaultIndex, onChange,
  accentColor, textColor, mutedColor, bgColor, borderColor,
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const lastIndex = useRef(defaultIndex);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: defaultIndex * ITEM_H, animated: false });
    }, 80);
    return () => clearTimeout(timer);
  }, []);

  const onMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const rawIdx = e.nativeEvent.contentOffset.y / ITEM_H;
    const idx = Math.min(Math.max(Math.round(rawIdx), 0), items.length - 1);
    if (idx !== lastIndex.current) {
      lastIndex.current = idx;
      onChange(idx);
    }
  }, [items.length, onChange]);

  return (
    <View style={{ width: 72, height: ITEM_H * VISIBLE, position: 'relative' }}>
      {/* Selection highlight */}
      <View
        pointerEvents="none"
        style={[
          styles.selectionRect,
          { top: PAD, borderColor: accentColor, backgroundColor: accentColor + '22' },
        ]}
      />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumEnd}
        contentContainerStyle={{ paddingVertical: PAD }}
        style={{ flex: 1 }}
      >
        {items.map((label, i) => (
          <View key={i} style={styles.itemContainer}>
            <Text
              style={[
                styles.itemText,
                { color: mutedColor },
              ]}
            >
              {label}
            </Text>
          </View>
        ))}
      </ScrollView>
      {/* Top fade */}
      <LinearGradient
        colors={[bgColor, bgColor + 'CC', bgColor + '00']}
        style={[styles.fade, styles.fadeTop]}
        pointerEvents="none"
      />
      {/* Bottom fade */}
      <LinearGradient
        colors={[bgColor + '00', bgColor + 'CC', bgColor]}
        style={[styles.fade, styles.fadeBottom]}
        pointerEvents="none"
      />
    </View>
  );
};

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

interface TimeCarouselPickerProps {
  hour: number;
  minute: number;
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
  accentColor: string;
  textColor: string;
  mutedColor: string;
  bgColor: string;
  borderColor: string;
}

const TimeCarouselPicker: React.FC<TimeCarouselPickerProps> = ({
  hour, minute,
  onHourChange, onMinuteChange,
  accentColor, textColor, mutedColor, bgColor, borderColor,
}) => (
  <View style={[styles.container, { backgroundColor: bgColor, borderColor }]}>
    <WheelColumn
      items={HOURS}
      defaultIndex={hour}
      onChange={onHourChange}
      accentColor={accentColor}
      textColor={textColor}
      mutedColor={mutedColor}
      bgColor={bgColor}
      borderColor={borderColor}
    />
    <Text style={[styles.colon, { color: accentColor }]}>:</Text>
    <WheelColumn
      items={MINUTES}
      defaultIndex={minute}
      onChange={onMinuteChange}
      accentColor={accentColor}
      textColor={textColor}
      mutedColor={mutedColor}
      bgColor={bgColor}
      borderColor={borderColor}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 12,
    marginVertical: 4,
  },
  selectionRect: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: ITEM_H,
    borderRadius: 10,
    borderWidth: 1.5,
    zIndex: 1,
  },
  itemContainer: {
    height: ITEM_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 26,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  colon: {
    fontSize: 28,
    fontWeight: '700',
    marginHorizontal: 6,
    marginBottom: 2,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: PAD,
    zIndex: 2,
    pointerEvents: 'none',
  },
  fadeTop: { top: 0 },
  fadeBottom: { bottom: 0 },
});

export default TimeCarouselPicker;
