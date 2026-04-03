import { MaterialIcons } from "@expo/vector-icons";
import { getInfoAsync } from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import * as MediaLibrary from "expo-media-library";
import React, { useCallback, useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { formatMB } from "../services/scan-orchestrator";
import { useScanStore } from "../store/scan-store";
import { Colors } from "../theme";
import type { ScoredResult } from "../types";

const UNDO_DURATION_MS = 6000;

async function getFileSize(uri: string | null | undefined): Promise<number | null> {
  if (!uri) return null;

  const info = await getInfoAsync(uri).catch(() => null);
  if (!info || !info.exists) {
    return null;
  }

  return info.size;
}

async function resolveAssetSize(item: ScoredResult): Promise<number> {
  const directSize = await getFileSize(item.asset.uri);
  if (directSize !== null) {
    return directSize;
  }

  const assetInfo = await MediaLibrary.getAssetInfoAsync(item.asset.id, {
    shouldDownloadFromNetwork: false,
  }).catch(() => null);

  if (!assetInfo) {
    return 0;
  }

  return (await getFileSize(assetInfo.localUri ?? assetInfo.uri)) ?? 0;
}

export function UndoSnackbar(): React.JSX.Element | null {
  const { state, undoDeletion, commitDeletion } = useScanStore();
  const { pendingDeletions, stats } = state;

  const progressAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const statsRef = useRef(stats);

  const hasPending = pendingDeletions.length > 0;

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  useEffect(() => {
    if (!hasPending) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 80,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    if (progressAnimRef.current) progressAnimRef.current.stop();
    progressAnim.setValue(1);

    // Slide up with a light spring
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 220,
        mass: 0.9,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    // Drain the teal progress bar
    progressAnimRef.current = Animated.timing(progressAnim, {
      toValue: 0,
      duration: UNDO_DURATION_MS,
      useNativeDriver: false,
    });
    progressAnimRef.current.start();

    commitTimerRef.current = setTimeout(async () => {
      const items = pendingDeletions;
      if (items.length === 0) return;
      try {
        const sizes = await Promise.all(items.map(resolveAssetSize));
        const totalBytes = sizes.reduce((s, n) => s + n, 0);
        const assetIds = items.map((r) => r.asset.id);
        const success = await MediaLibrary.deleteAssetsAsync(assetIds);

        if (success) {
          const currentStats = statsRef.current;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          commitDeletion({
            totalDeleted: currentStats.totalDeleted + items.length,
            totalMBFreed: currentStats.totalMBFreed + totalBytes,
          });
        } else {
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
  }, [commitDeletion, hasPending, opacityAnim, pendingDeletions, progressAnim, slideAnim, undoDeletion]);

  const handleUndo = useCallback(() => {
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    if (progressAnimRef.current) progressAnimRef.current.stop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    undoDeletion();
  }, [undoDeletion]);

  const totalBytes = pendingDeletions.reduce(
    (sum, r) => sum + r.asset.fileSize,
    0,
  );
  const count = pendingDeletions.length;

  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
      ]}
      pointerEvents={hasPending ? "auto" : "none"}
    >
      {/* ── Teal countdown bar runs along the top edge ── */}
      <View style={styles.timerTrack}>
        <Animated.View
          style={[styles.timerFill, { width: progressBarWidth }]}
        />
      </View>

      <View style={styles.body}>
        {/* Left: status icon */}
        <View style={styles.iconCircle}>
          <MaterialIcons name="delete-sweep" size={20} color={Colors.danger} />
        </View>

        {/* Centre: message block */}
        <View style={styles.textBlock}>
          <Text style={styles.label} numberOfLines={1}>
            {count} image{count !== 1 ? "s" : ""} removed
          </Text>
          <Text style={styles.meta}>
            {formatMB(totalBytes)} · tap Undo to restore
          </Text>
        </View>

        {/* Right: primary action */}
        <Pressable
          onPress={handleUndo}
          style={({ pressed }) => [
            styles.undoBtn,
            pressed && styles.undoBtnPressed,
          ]}
          hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
        >
          <MaterialIcons
            name="undo"
            size={14}
            color={Colors.onPrimary}
            style={styles.undoIcon}
          />
          <Text style={styles.undoLabel}>Undo</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: Colors.bgSurface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    // Crisp layered shadow matching the sheet look
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 12,
  },

  // ── Timer bar ──────────────────────────────────────────────────
  timerTrack: {
    height: 3,
    backgroundColor: Colors.outlineVariant,
  },
  timerFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 2,
  },

  // ── Content row ────────────────────────────────────────────────
  body: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },

  // Delete icon badge
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.trashIconBg,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  // Text column
  textBlock: {
    flex: 1,
    gap: 3,
  },
  label: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 14,
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  meta: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  // Teal Undo button
  undoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    flexShrink: 0,
  },
  undoBtnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  undoIcon: {
    marginTop: 1,
  },
  undoLabel: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 13,
    color: Colors.onPrimary,
    letterSpacing: 0.2,
  },
});
