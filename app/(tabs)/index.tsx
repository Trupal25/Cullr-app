import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "../../src/components/header";
import { useMediaPermission } from "../../src/hooks/use-permissions";
import { runScan } from "../../src/services/scan-orchestrator";
import { useScanStore } from "../../src/store/scan-store";
import { Colors } from "../../src/theme";
import type { ScanConfig, ScanRange, ScanType } from "../../src/types";

// ── Config data ──────────────────────────────────────────────────────────────

type RangeOption = {
  value: ScanRange;
  label: string;
  desc: string;
  icon: keyof typeof MaterialIcons.glyphMap;
};

const RANGE_OPTIONS: RangeOption[] = [
  { value: 100, label: "Last 100", desc: "Quick scan", icon: "bolt" },
  {
    value: 500,
    label: "Last 500",
    desc: "Recent photos",
    icon: "photo-library",
  },
  { value: 1000, label: "Last 1,000", desc: "Deep scan", icon: "collections" },
  {
    value: "all",
    label: "All Photos",
    desc: "Full gallery",
    icon: "all-inclusive",
  },
];

type ScanTypeOption = {
  value: ScanType;
  label: string;
  desc: string;
  icon: keyof typeof MaterialIcons.glyphMap;
};

const SCAN_TYPE_OPTIONS: ScanTypeOption[] = [
  {
    value: "metadata",
    label: "Smart Spam Scan",
    desc: "Analyzes resolution, file size & messaging patterns to find forwarded junk",
    icon: "auto-awesome",
  },
  {
    value: "source",
    label: "App Bulk Review",
    desc: "Shows ALL images from WhatsApp, Telegram & Instagram for quick triage",
    icon: "apps",
  },
];

type ConfigStep = "idle" | "range" | "type" | "scanning";

// ── Component ────────────────────────────────────────────────────────────────

export default function ScanHomeScreen(): React.JSX.Element {
  const router = useRouter();
  const {
    state,
    setScanStatus,
    setScanProgress,
    setResults,
    setScanType,
    updateStats,
  } = useScanStore();
  const { requestPermission, status: permissionStatus } = useMediaPermission();
  const stats = state.stats;

  const [configStep, setConfigStep] = useState<ConfigStep>("idle");
  const [selectedRange, setSelectedRange] = useState<ScanRange>(500);
  const [selectedType, setSelectedType] = useState<ScanType>("metadata");

  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(1.15, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: 2 - pulseScale.value,
  }));

  const handleStartConfig = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConfigStep("range");
  }, []);

  const handleRangeSelect = useCallback((range: ScanRange) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRange(range);
    setConfigStep("type");
  }, []);

  const handleTypeSelect = useCallback((type: ScanType) => {
    Haptics.selectionAsync();
    setSelectedType(type);
  }, []);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (configStep === "type") {
      setConfigStep("range");
    } else {
      setConfigStep("idle");
    }
  }, [configStep]);

  const handleStartScan = useCallback(async (): Promise<void> => {
    // Gate on permission
    if (permissionStatus !== "granted") {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert(
          "Permission Required",
          "Cullr needs access to your photo library to scan for spam images.",
        );
        return;
      }
    }

    const config: ScanConfig = {
      range: selectedRange,
      type: selectedType,
    };

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScanType(selectedType);
    setConfigStep("scanning");
    setScanStatus("scanning");

    try {
      const { results, totalScanned } = await runScan((label, progress) => {
        setScanProgress(progress, label);
      }, config);

      setResults(results);

      // Update cumulative all-time stats
      updateStats({
        lastScanDate: new Date().toISOString(),
        totalScanned: stats.totalScanned + totalScanned,
        totalFlagged: stats.totalFlagged + results.length,
      });

      const nextRoute =
        results.length > 0 ? "/(tabs)/results" : "/(tabs)/empty";
      router.replace(nextRoute);
    } catch {
      setScanStatus("idle");
      setConfigStep("idle");
      Alert.alert(
        "Scan Error",
        "Something went wrong while scanning your gallery.",
      );
    }
  }, [
    permissionStatus,
    requestPermission,
    router,
    selectedRange,
    selectedType,
    setResults,
    setScanProgress,
    setScanStatus,
    setScanType,
    stats.totalFlagged,
    stats.totalScanned,
    updateStats,
  ]);

  const lastScan = stats.lastScanDate
    ? formatRelativeDate(stats.lastScanDate)
    : null;
  const deletedCount = stats.totalDeleted;
  const selectedMode = SCAN_TYPE_OPTIONS.find(
    (option) => option.value === selectedType,
  );
  const selectedRangeLabel =
    selectedRange === "all"
      ? "All photos"
      : `Last ${selectedRange.toLocaleString()} photos`;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <Header />
      <View style={styles.content}>
        {/* Idle state */}
        {configStep === "idle" && (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={styles.centerContainer}
          >
            <View style={styles.idleMainBlock}>
              <View style={styles.labelSection}>
                <Text style={styles.intelligenceLabel}>
                  Gallery Intelligence
                </Text>
                <View style={styles.labelDivider} />
              </View>

              <View style={styles.scannerSection}>
                <Pressable
                  onPress={handleStartConfig}
                  style={({ pressed }) => [
                    styles.scanButton,
                    pressed && styles.scanButtonPressed,
                  ]}
                >
                  <Animated.View style={[styles.pulseRing, pulseStyle]} />
                  <MaterialIcons
                    name="photo-camera"
                    size={36}
                    color={Colors.primary}
                  />
                </Pressable>

                <View style={styles.scanTextContainer}>
                  <Text style={styles.scanTitle}>Scan Gallery</Text>
                </View>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.activityChip,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(tabs)/stats");
              }}
            >
              <MaterialIcons
                name="history"
                size={18}
                color={Colors.textMuted}
              />
              <Text style={styles.activityText}>
                {lastScan
                  ? `Last scan: ${lastScan}${deletedCount > 0 ? ` • ${deletedCount} images deleted` : ""}`
                  : "No scans yet"}
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Step 1: Choose range */}
        {configStep === "range" && (
          <Animated.View
            entering={SlideInDown.duration(350).springify()}
            style={styles.flowContainer}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.flowScrollContent}
            >
              <View style={styles.flowTopRow}>
                <Pressable onPress={handleBack} style={styles.backButton}>
                  <MaterialIcons
                    name="arrow-back"
                    size={20}
                    color={Colors.textSecondary}
                  />
                </Pressable>
                <View style={styles.progressDots}>
                  <View
                    style={[styles.progressDot, styles.progressDotActive]}
                  />
                  <View style={styles.progressDot} />
                </View>
              </View>

              <Text style={styles.stepLabel}>Step 1 of 2</Text>
              <Text style={styles.stepTitle}>Choose scan depth</Text>
              <Text style={styles.stepDesc}>
                Select how many photos you want to review right now.
              </Text>

              <View style={styles.optionsGrid}>
                {RANGE_OPTIONS.map((opt) => {
                  const isSelected = selectedRange === opt.value;
                  return (
                    <Pressable
                      key={String(opt.value)}
                      onPress={() => handleRangeSelect(opt.value)}
                      style={({ pressed }) => [
                        styles.optionCard,
                        isSelected && styles.optionCardSelected,
                        pressed && styles.optionCardPressed,
                      ]}
                    >
                      <View style={styles.optionCardTopRow}>
                        <View
                          style={[
                            styles.optionIconContainer,
                            isSelected && styles.optionIconSelected,
                          ]}
                        >
                          <MaterialIcons
                            name={opt.icon}
                            size={20}
                            color={
                              isSelected ? Colors.onPrimary : Colors.textMuted
                            }
                          />
                        </View>
                        {isSelected && (
                          <MaterialIcons
                            name="check-circle"
                            size={18}
                            color={Colors.primary}
                          />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.optionLabel,
                          isSelected && styles.optionLabelSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text style={styles.optionDesc}>{opt.desc}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </Animated.View>
        )}

        {/* Step 2: Choose scan type */}
        {configStep === "type" && (
          <Animated.View
            entering={SlideInDown.duration(350).springify()}
            style={styles.flowContainer}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.flowScrollContent}
            >
              <View style={styles.flowTopRow}>
                <Pressable onPress={handleBack} style={styles.backButton}>
                  <MaterialIcons
                    name="arrow-back"
                    size={20}
                    color={Colors.textSecondary}
                  />
                </Pressable>
                <View style={styles.progressDots}>
                  <View
                    style={[styles.progressDot, styles.progressDotActive]}
                  />
                  <View
                    style={[styles.progressDot, styles.progressDotActive]}
                  />
                </View>
              </View>

              <Text style={styles.stepLabel}>Step 2 of 2</Text>
              <Text style={styles.stepTitle}>Pick detection mode</Text>
              <Text style={styles.stepDesc}>
                Choose how Cullr decides which images should be flagged.
              </Text>

              <View style={styles.typeList}>
                {SCAN_TYPE_OPTIONS.map((opt) => {
                  const isSelected = selectedType === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => handleTypeSelect(opt.value)}
                      style={({ pressed }) => [
                        styles.typeCard,
                        isSelected && styles.typeCardSelected,
                        pressed && styles.typeCardPressed,
                      ]}
                    >
                      <View
                        style={[
                          styles.typeIconContainer,
                          isSelected && styles.typeIconSelected,
                        ]}
                      >
                        <MaterialIcons
                          name={opt.icon}
                          size={22}
                          color={
                            isSelected ? Colors.onPrimary : Colors.textMuted
                          }
                        />
                      </View>
                      <View style={styles.typeTextContainer}>
                        <Text
                          style={[
                            styles.typeLabel,
                            isSelected && styles.typeLabelSelected,
                          ]}
                        >
                          {opt.label}
                        </Text>
                        <Text style={styles.typeDesc}>{opt.desc}</Text>
                      </View>
                      <View
                        style={[
                          styles.radio,
                          isSelected && styles.radioSelected,
                        ]}
                      >
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.summaryBar}>
                <MaterialIcons name="tune" size={16} color={Colors.textMuted} />
                <Text style={styles.summaryText}>
                  {selectedRangeLabel} • {selectedMode?.label}
                </Text>
              </View>

              <Pressable
                onPress={handleStartScan}
                style={({ pressed }) => [
                  styles.startScanButton,
                  pressed && styles.startScanButtonPressed,
                ]}
              >
                <MaterialIcons
                  name="radar"
                  size={20}
                  color={Colors.onPrimary}
                />
                <Text style={styles.startScanText}>Start Scan</Text>
              </Pressable>
            </ScrollView>
          </Animated.View>
        )}

        {/* Scanning state */}
        {configStep === "scanning" && (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={styles.centerContainer}
          >
            <View style={styles.scannerSection}>
              <View style={[styles.scanButton, styles.scanButtonScanning]}>
                <Animated.View style={[styles.pulseRing, pulseStyle]} />
                <View style={styles.progressContainer}>
                  <Text style={styles.progressText}>{state.scanProgress}%</Text>
                </View>
              </View>

              <View style={styles.scanTextContainer}>
                <Text style={styles.scanTitle}>Scanning...</Text>
                <Text style={styles.scanSubtitle}>{state.scanPhaseLabel}</Text>
              </View>
            </View>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}

function formatRelativeDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 2) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bgBase,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Idle state ──
  idleMainBlock: {
    alignItems: "center",
    transform: [{ translateY: -80 }],
  },
  labelSection: {
    alignItems: "center",
    marginBottom: 60,
  },
  intelligenceLabel: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: Colors.textSecondary,
    marginBottom: 5,
  },
  labelDivider: {
    width: 32,
    height: 1,
    backgroundColor: Colors.surfaceContainerHighest,
  },
  scannerSection: {
    alignItems: "center",
    gap: 10,
  },
  scanButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: "rgba(13, 118, 110, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3ECFBF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 40,
    elevation: 4,
  },
  scanButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  scanButtonScanning: {
    borderColor: Colors.primary,
  },
  pulseRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: "rgba(13, 118, 110, 0.1)",
  },
  progressContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  progressText: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 28,
    color: Colors.primary,
  },
  scanTextContainer: {
    alignItems: "center",
  },
  scanTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: 1,
  },
  scanSubtitle: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "capitalize",
    color: Colors.textDark,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 300,
    paddingTop: 4,
  },
  activityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 108,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  },
  activityText: {
    flex: 1,
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: Colors.textMuted,
  },

  // ── Flow steps ──
  flowContainer: {
    flex: 1,
    paddingTop: 8,
  },
  flowScrollContent: {
    paddingTop: 8,
    paddingBottom: 132,
  },
  flowTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  progressDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressDot: {
    width: 34,
    height: 6,
    borderRadius: 999,
    backgroundColor: Colors.outlineVariant,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
  },
  stepLabel: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 11,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: Colors.primary,
    marginBottom: 10,
  },
  stepTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 30,
    lineHeight: 36,
    color: Colors.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.7,
  },
  stepDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },

  // ── Range grid ──
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  optionCard: {
    width: "48%",
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 8,
  },
  optionCardSelected: {
    borderColor: "rgba(13, 118, 110, 0.35)",
    backgroundColor: "rgba(13, 118, 110, 0.08)",
  },
  optionCardPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  optionCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  optionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: Colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  optionIconSelected: {
    backgroundColor: Colors.primaryContainer,
  },
  optionLabel: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 15,
    color: Colors.textPrimary,
  },
  optionLabelSelected: {
    color: Colors.primary,
  },
  optionDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
  },

  // ── Scan type list ──
  typeList: {
    gap: 12,
  },
  typeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  typeCardSelected: {
    borderColor: "rgba(13, 118, 110, 0.35)",
    backgroundColor: "rgba(13, 118, 110, 0.08)",
  },
  typeCardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  typeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  typeIconSelected: {
    backgroundColor: Colors.primaryContainer,
  },
  typeTextContainer: {
    flex: 1,
  },
  typeLabel: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  typeLabelSelected: {
    color: Colors.primary,
  },
  typeDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.surfaceContainerHighest,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  radioSelected: {
    borderColor: Colors.primaryContainer,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primaryContainer,
  },

  // ── Summary + CTA ──
  summaryBar: {
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  summaryText: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 12,
    letterSpacing: 0.5,
    color: Colors.textMuted,
  },
  startScanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 16,
    paddingVertical: 16,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    shadowColor: "#0D766E",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 3,
  },
  startScanButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  startScanText: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16,
    letterSpacing: 0.5,
    color: Colors.onPrimary,
  },
});
