import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';
import { useScanStore } from '../store/scan-store';
import { formatMB } from '../services/scan-orchestrator';
import { Colors } from '../theme';

const UNDO_DURATION_MS = 6000; // 6 seconds

export function UndoSnackbar(): React.JSX.Element | null {
  const { state, undoDeletion, commitDeletion } = useScanStore();
  const { pendingDeletions } = state;

  // Animated values
  const progressAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Refs to safely cancel timers on undo
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const hasPending = pendingDeletions.length > 0;

  // Reset + re-animate whenever a new batch of pending deletions arrives
  useEffect(() => {
    if (!hasPending) {
      // Slide out
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 80, duration: 280, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start();
      return;
    }

    // Clear any previous timers
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    if (progressAnimRef.current) progressAnimRef.current.stop();
    progressAnim.setValue(1);

    // Slide in
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // Drain the progress bar over UNDO_DURATION_MS
    progressAnimRef.current = Animated.timing(progressAnim, {
      toValue: 0,
      duration: UNDO_DURATION_MS,
      useNativeDriver: false, // must be false for width animation
    });
    progressAnimRef.current.start();

    // After timeout: commit the deletion for real
    commitTimerRef.current = setTimeout(async () => {
      const items = pendingDeletions; // capture snapshot
      if (items.length === 0) return;

      try {
        const assetIds = items.map((r) => r.asset.id);
        const success = await MediaLibrary.deleteAssetsAsync(assetIds);
        if (success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          const totalBytes = items.reduce((sum, r) => sum + r.asset.fileSize, 0);
          commitDeletion({
            totalDeleted: state.stats.totalDeleted + items.length,
            totalMBFreed: state.stats.totalMBFreed + totalBytes / (1024 * 1024),
          });
        } else {
          // If delete fails, quietly restore the items
          undoDeletion();
        }
      } catch {
        undoDeletion();
      }
    }, UNDO_DURATION_MS);

    return () => {
      if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
      if (progressAnimRef.current) progressAnimRef.current.stop();
    };
    // intentionally only re-run when hasPending flips or a new batch arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDeletions]);

  const handleUndo = useCallback(() => {
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    if (progressAnimRef.current) progressAnimRef.current.stop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    undoDeletion();
  }, [undoDeletion]);

  if (!hasPending) return null;

  const totalBytes = pendingDeletions.reduce((sum, r) => sum + r.asset.fileSize, 0);
  const count = pendingDeletions.length;

  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
      ]}
    >
      {/* Timed progress bar — drains left to right */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressBar, { width: progressBarWidth }]} />
      </View>

      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="delete-outline" size={18} color={Colors.danger} />
        </View>

        <View style={styles.textGroup}>
          <Text style={styles.title} numberOfLines={1}>
            {count} image{count !== 1 ? 's' : ''} deleted
          </Text>
          <Text style={styles.subtitle}>{formatMB(totalBytes)} freed · moves to system trash</Text>
        </View>

        <Pressable
          onPress={handleUndo}
          style={({ pressed }) => [styles.undoButton, pressed && styles.undoButtonPressed]}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        >
          <Text style={styles.undoText}>Undo</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 96,          // sits above the bottom nav / action bar
    left: 16,
    right: 16,
    backgroundColor: Colors.textDark,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 20,
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.danger,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textGroup: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  undoButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.primaryContainer,
    borderRadius: 6,
    flexShrink: 0,
  },
  undoButtonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  undoText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
