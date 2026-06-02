import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getRemovalConfirmationText,
  getRemovalDestination,
  removeAssetsAsync,
  usesUndoWindow,
} from "../src/services/media-deletion";
import { formatMB } from "../src/services/scan-orchestrator";
import { useScanStore } from "../src/store/scan-store";
import { Colors } from "../src/theme";

export default function DeleteConfirmScreen(): React.JSX.Element {
  const router = useRouter();
  const { state, stageDeletion, commitRemoval } = useScanStore();
  const [deleting, setDeleting] = useState(false);
  const translateY = useSharedValue(120);
  const sheetOpacity = useSharedValue(0);
  const isClosing = useRef(false);

  useEffect(() => {
    translateY.value = withSpring(0, {
      damping: 16,
      stiffness: 260,
      mass: 0.82,
      velocity: 2.1,
    });
    sheetOpacity.value = withTiming(1, {
      duration: 140,
      easing: Easing.out(Easing.cubic),
    });
  }, [sheetOpacity, translateY]);

  const selectedResults = useMemo(
    () => state.scanResults.filter((r) => state.selectedIds.has(r.asset.id)),
    [state.scanResults, state.selectedIds],
  );

  const selectedCount = selectedResults.length;
  const selectedBytes = useMemo(
    () => selectedResults.reduce((sum, r) => sum + r.asset.fileSize, 0),
    [selectedResults],
  );
  const destination = getRemovalDestination();
  const hasUndoWindow = usesUndoWindow();
  const removalActionLabel =
    destination === "android-trash"
      ? "Move To Trash"
      : destination === "ios-recently-deleted"
        ? "Move to Recently Deleted"
        : `Delete ${selectedCount}`;

  const closeWithAnimation = useCallback(
    (onComplete: () => void): void => {
      if (isClosing.current) return;

      isClosing.current = true;
      translateY.value = withSpring(
        260,
        {
          damping: 20,
          stiffness: 300,
          mass: 0.9,
          velocity: 2.4,
          overshootClamping: true,
        },
        (finished) => {
          if (finished) {
            runOnJS(onComplete)();
          }
        },
      );
      sheetOpacity.value = withTiming(0, {
        duration: 120,
        easing: Easing.out(Easing.cubic),
      });
    },
    [sheetOpacity, translateY],
  );

  const handleCancel = useCallback((): void => {
    closeWithAnimation(() => router.back());
  }, [closeWithAnimation, router]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(8)
        .failOffsetX([-20, 20])
        .onUpdate((event) => {
          const rawDrag = Math.max(0, event.translationY);
          const dampedDrag =
            rawDrag > 150 ? 150 + (rawDrag - 150) * 0.24 : rawDrag;
          translateY.value = dampedDrag;
        })
        .onEnd((event) => {
          const shouldDismiss =
            event.translationY > 110 || event.velocityY > 1150;

          if (shouldDismiss) {
            runOnJS(handleCancel)();
            return;
          }

          translateY.value = withSpring(0, {
            damping: 17,
            stiffness: 280,
            mass: 0.78,
          });
        }),
    [handleCancel, translateY],
  );

  const sheetAnimatedStyle = useAnimatedStyle(() => {
    const dragOpacity = interpolate(
      translateY.value,
      [0, 220],
      [1, 0.75],
      Extrapolation.CLAMP,
    );

    return {
      opacity: dragOpacity * sheetOpacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  const removeWithSystemRecovery = useCallback(async (): Promise<void> => {
    try {
      const success = await removeAssetsAsync(
        selectedResults.map((item) => item.asset.id),
      );

      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        commitRemoval(selectedResults, selectedBytes);
      }
    } catch (error) {
      const message =
        error instanceof Error &&
        error.message.includes("until the Android app is rebuilt")
          ? "Rebuild and reopen the Android app to use system Trash. No images were removed."
          : "The images could not be removed. Your selection has been preserved.";
      Alert.alert("Could not remove images", message);
    }
  }, [commitRemoval, selectedBytes, selectedResults]);

  const handleDelete = (): void => {
    if (deleting || selectedCount === 0) return;

    setDeleting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    if (hasUndoWindow) {
      stageDeletion(selectedResults);
      closeWithAnimation(() => router.back());
      return;
    }

    closeWithAnimation(() => {
      router.back();
      void removeWithSystemRecovery();
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <Animated.View style={styles.backdrop} pointerEvents="none" />
      <Pressable style={styles.overlay} onPress={handleCancel} />

      <View style={styles.sheetContainer}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={sheetAnimatedStyle}>
            <View style={styles.sheet}>
              <View style={styles.handleRow}>
                <View style={styles.handle} />
              </View>

              <View style={styles.sheetContent}>
                <View style={styles.trashIconContainer}>
                  <MaterialIcons
                    name="delete"
                    size={24}
                    color={Colors.danger}
                  />
                </View>

                <Text style={styles.headline}>
                  Delete {selectedCount} image{selectedCount !== 1 ? "s" : ""}?
                </Text>

                <Text style={styles.bodyText}>
                  {getRemovalConfirmationText()}
                </Text>

                <View style={styles.statRow}>
                  <View style={styles.statChip}>
                    <Text style={styles.statText}>
                      {formatMB(selectedBytes)} selected
                    </Text>
                  </View>
                  <View style={styles.statChip}>
                    <Text style={styles.statText}>{selectedCount} files</Text>
                  </View>
                </View>

                <View style={styles.actions}>
                  <Pressable
                    onPress={handleDelete}
                    disabled={deleting}
                    style={({ pressed }) => [
                      styles.deleteButton,
                      pressed && styles.deleteButtonPressed,
                      deleting && styles.deleteButtonDisabled,
                    ]}
                  >
                    <Text style={styles.deleteButtonText}>
                      {removalActionLabel}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleCancel}
                    disabled={deleting}
                    style={({ pressed }) => [
                      styles.cancelButton,
                      pressed && styles.cancelButtonPressed,
                    ]}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={styles.statusBar}>
              <Text style={styles.statusText}>
                {destination === "android-trash"
                  ? "Device Trash"
                  : destination === "ios-recently-deleted"
                    ? "Recently Deleted"
                    : "Permanent removal"}
              </Text>
              <Text style={styles.statusText}>
                {hasUndoWindow ? "Undo: 6s" : "Recovery available"}
              </Text>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  ghostGrid: {
    width: "80%",
    maxWidth: 400,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    opacity: 0.2,
  },
  ghostCell: {
    width: "31.5%",
    aspectRatio: 1,
    backgroundColor: Colors.surfaceContainerHighest,
  },
  sheetContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.sheetBg,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 24,
  },
  handleRow: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.handleBg,
  },
  sheetContent: {
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: "center",
  },
  trashIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.trashIconBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  headline: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 24,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  bodyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: 28,
  },
  statRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 32,
  },
  statChip: {
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statText: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: Colors.textMuted,
  },
  actions: {
    width: "100%",
    gap: 10,
  },
  deleteButton: {
    width: "100%",
    paddingVertical: 16,
    backgroundColor: Colors.dangerMuted,
    borderWidth: 1,
    borderColor: Colors.dangerBorder,
    alignItems: "center",
  },
  deleteButtonPressed: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    transform: [{ scale: 0.98 }],
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 16,
    color: Colors.danger,
    letterSpacing: -0.3,
  },
  cancelButton: {
    width: "100%",
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  cancelText: {
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 16,
    color: Colors.textMuted,
    letterSpacing: -0.3,
  },
  statusBar: {
    backgroundColor: Colors.surfaceContainerHigh,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(15, 23, 42, 0.1)",
  },
  statusText: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: Colors.onSecondaryContainer,
  },
});
