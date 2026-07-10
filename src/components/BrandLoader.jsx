/**
 * BrandLoader — the animated "loading / opening" screen.
 *
 * Shows the Detail Go van logo (assets/van.png) driving in place over a clean
 * white background: the van bobs and leans as if in motion, with scrolling
 * motion streaks behind it and an indeterminate progress bar underneath.
 * Rendered while the app boots and wherever a full-screen load is needed.
 * All animation runs on the native driver (transforms + opacity).
 */

import { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, Easing, StyleSheet } from 'react-native';

import { colors } from '@/constants/theme';

const VAN = require('../../assets/van.png');

/** Loops an Animated.Value 0→1 forever. */
const loop = (value, duration, easing = Easing.linear) =>
  Animated.loop(
    Animated.timing(value, {
      toValue: 1,
      duration,
      easing,
      useNativeDriver: true,
    })
  );

export function BrandLoader() {
  const bob = useRef(new Animated.Value(0)).current; // van bob
  const streak = useRef(new Animated.Value(0)).current; // motion streaks
  const progress = useRef(new Animated.Value(0)).current; // progress shimmer

  useEffect(() => {
    const animations = [
      loop(streak, 700),
      loop(progress, 1300, Easing.inOut(Easing.ease)),
      Animated.loop(
        Animated.sequence([
          Animated.timing(bob, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(bob, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ),
    ];
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [bob, streak, progress]);

  const vanLift = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  const vanTilt = bob.interpolate({ inputRange: [0, 1], outputRange: ['-1.2deg', '1.2deg'] });
  const streakShift = streak.interpolate({ inputRange: [0, 1], outputRange: [0, -STREAK_STEP] });
  const progressShift = progress.interpolate({ inputRange: [0, 1], outputRange: [-BAR_HL, TRACK_W] });

  return (
    <View style={styles.root}>
      <View style={styles.scene}>
        {/* Scrolling motion streaks behind the van */}
        <View style={styles.streaks}>
          <Animated.View style={[styles.streakRow, { transform: [{ translateX: streakShift }] }]}>
            {Array.from({ length: STREAK_COUNT }).map((_, i) => (
              <View key={i} style={[styles.streak, i % 2 ? styles.streakShort : null]} />
            ))}
          </Animated.View>
        </View>

        <Animated.View style={{ transform: [{ translateY: vanLift }, { rotate: vanTilt }] }}>
          <Image source={VAN} style={styles.van} resizeMode="contain" />
        </Animated.View>
      </View>

      <Text style={styles.wordmark}>DETAIL GO</Text>

      <View style={styles.track}>
        <Animated.View style={[styles.trackFill, { transform: [{ translateX: progressShift }] }]} />
      </View>
    </View>
  );
}

const STREAK_STEP = 40;
const STREAK_COUNT = 10;
const TRACK_W = 190;
const BAR_HL = 64;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: 24,
  },

  scene: { width: 260, height: 150, alignItems: 'center', justifyContent: 'center' },
  van: { width: 240, height: 140 },

  streaks: {
    position: 'absolute',
    left: 0,
    top: 62,
    width: 130,
    height: 46,
    overflow: 'hidden',
  },
  streakRow: { flex: 1, justifyContent: 'space-around', paddingVertical: 4 },
  streak: {
    height: 3,
    width: 70,
    borderRadius: 2,
    backgroundColor: colors.silver,
  },
  streakShort: { width: 44, backgroundColor: colors.aqua, opacity: 0.5 },

  wordmark: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 4,
  },

  track: {
    width: TRACK_W,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  trackFill: {
    width: BAR_HL,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
});

export default BrandLoader;
