import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { COLORS, TYPE, GAP } from '../constants/theme';

export default function LoadingOverlay({ message = 'Processing...', sub = '' }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={s.overlay}>
      <Animated.View style={[s.ring, { transform: [{ rotate }] }]} />
      <Text style={s.msg}>{message}</Text>
      {sub ? <Text style={s.sub}>{sub}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.overlay,
    justifyContent: 'center', alignItems: 'center', zIndex: 999,
  },
  ring: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 3, borderColor: COLORS.primary, borderTopColor: 'transparent',
    marginBottom: GAP.xl,
  },
  msg: { color: COLORS.text, fontSize: TYPE.lg, fontWeight: '600', textAlign: 'center' },
  sub: { color: COLORS.textDim, fontSize: TYPE.sm, marginTop: GAP.sm, textAlign: 'center' },
});