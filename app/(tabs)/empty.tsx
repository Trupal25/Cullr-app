import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "../../src/components/header";
import { StatusBarPill } from "../../src/components/status-bar-pill";
import { useMediaPermission } from "../../src/hooks/use-permissions";
import { runScan } from "../../src/services/scan-orchestrator";
import { useScanStore } from "../../src/store/scan-store";
import { Colors } from "../../src/theme";

export default function EmptyStateScreen(): React.JSX.Element {
  const router = useRouter();
  const { setScanStatus, setScanProgress, setResults, updateStats, state } =
    useScanStore();
  const { requestPermission, status: permissionStatus } = useMediaPermission();
  const { lastScanType, stats } = state;

  const handleScanAgain = useCallback(async (): Promise<void> => {
    if (permissionStatus !== "granted") {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert(
          "Permission Required",
          "Cullr needs access to your photo library.",
        );
        return;
      }
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScanStatus("scanning");

    try {
      const { results, totalScanned } = await runScan(
        (label, progress) => {
          setScanProgress(progress, label);
        },
        { type: lastScanType, range: "all" },
      );

      setResults(results);
      updateStats({
        lastScanDate: new Date().toISOString(),
        totalScanned: stats.totalScanned + totalScanned,
        totalFlagged: stats.totalFlagged + results.length,
      });

      if (results.length > 0) {
        router.replace("/(tabs)/results");
      }
      // If still 0 results, we stay on this screen
      setScanStatus("done");
    } catch {
      setScanStatus("idle");
      Alert.alert("Scan Error", "Something went wrong while scanning.");
    }
  }, [
    lastScanType,
    permissionStatus,
    requestPermission,
    router,
    setResults,
    setScanProgress,
    setScanStatus,
    stats.totalFlagged,
    stats.totalScanned,
    updateStats,
  ]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <Header />

      <View style={styles.content}>
        <View style={styles.centerContent}>
          <View style={styles.graphicContainer}>
            <View style={styles.glowCircle} />
            <Text style={styles.zeroText}>0</Text>
            <View style={styles.underline} />
          </View>

          <View style={styles.textCluster}>
            <Text style={styles.headline}>Nothing to cull.</Text>
            <Text style={styles.subtitle}>
              {lastScanType === "source"
                ? "No app images found in this range."
                : "No junk found in this scan."}
            </Text>
          </View>

          <Pressable
            onPress={handleScanAgain}
            style={({ pressed }) => [
              styles.scanButton,
              pressed && styles.scanButtonPressed,
            ]}
          >
            <MaterialIcons
              name="refresh"
              size={18}
              color={Colors.textSecondary}
            />
            <Text style={styles.scanButtonText}>Scan Again</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.statusPillContainer}>
        <StatusBarPill />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bgBase,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  centerContent: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    gap: 40,
  },
  graphicContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  glowCircle: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(13, 118, 110, 0.05)",
  },
  zeroText: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 160,
    lineHeight: 160,
    color: Colors.primaryContainer,
    letterSpacing: -4,
    opacity: 0.8,
  },
  underline: {
    width: 48,
    height: 2,
    backgroundColor: Colors.outlineVariant,
    opacity: 0.3,
    marginTop: -8,
  },
  textCluster: {
    alignItems: "center",
    gap: 12,
  },
  headline: {
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 28,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 17,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 280,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    marginTop: 16,
  },
  scanButtonPressed: {
    borderColor: "rgba(13, 118, 110, 0.5)",
    backgroundColor: "rgba(13, 118, 110, 0.03)",
  },
  scanButtonText: {
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 11,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: Colors.textSecondary,
  },
  statusPillContainer: {
    marginBottom: 100,
  },
});
