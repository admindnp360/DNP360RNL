import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFirebaseStatus } from '@/hooks/useFirebaseStatus';

type BarState = 'connected' | 'offline' | 'back-online' | 'hidden';

const CONFIG = {
  connected:    { bg: '#DCFCE7', color: '#15803D', icon: 'wifi'     as const, text: 'Firebase Live'             },
  offline:      { bg: '#FEE2E2', color: '#DC2626', icon: 'wifi-off' as const, text: 'Offline · Saved locally'   },
  'back-online':{ bg: '#D1FAE5', color: '#059669', icon: 'zap'      as const, text: 'Back online · Data synced' },
  hidden:       { bg: 'transparent', color: '#000', icon: 'wifi' as const, text: '' },
};

export function SyncStatusBar() {
  const status = useFirebaseStatus();
  const insets = useSafeAreaInsets();
  const [barState, setBarState] = useState<BarState>('hidden');
  const prevStatus = useRef<typeof status | null>(null);

  const opacity  = useRef(new Animated.Value(0)).current;
  const slideY   = useRef(new Animated.Value(-32)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show(state: BarState) {
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
    setBarState(state);
    Animated.parallel([
      Animated.spring(opacity, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.spring(slideY,  { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
    ]).start();
  }

  function hide(delay = 0) {
    hideTimer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.timing(slideY,  { toValue: -32, duration: 350, useNativeDriver: true }),
      ]).start(() => setBarState('hidden'));
    }, delay);
  }

  useEffect(() => {
    const prev = prevStatus.current;
    prevStatus.current = status;

    if (status === 'offline') {
      show('offline');
    } else if (status === 'connected') {
      if (prev === 'offline') {
        show('back-online');
        hide(2500);
      } else if (prev === null) {
        // First connection — don't show anything
      }
    }
  }, [status]);

  useEffect(() => {
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, []);

  if (barState === 'hidden') return null;

  const cfg = CONFIG[barState];

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        { top: insets.top + 6, opacity, transform: [{ translateY: slideY }] },
      ]}
    >
      <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
        <View style={[styles.dot, { backgroundColor: cfg.color }]} />
        <Feather name={cfg.icon} size={10} color={cfg.color} />
        <Text style={[styles.text, { color: cfg.color }]}>{cfg.text}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
});
