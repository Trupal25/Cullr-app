import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomNav } from "../../src/components/bottom-nav";
import { Header } from "../../src/components/header";
// UndoSnackbar is rendered once in the tab layout
import { formatMB } from "../../src/services/scan-orchestrator";
import { useScanStore } from "../../src/store/scan-store";
import { Colors } from "../../src/theme";

export default function StatsScreen(): React.JSX.Element {
  const { state } = useScanStore();
  const { stats } = state;

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <Header />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.pageHeader}>
          <Text style={styles.title}>Your Impact</Text>
          <Text style={styles.subtitle}>
            All-time space saved and scans run
          </Text>
        </View>

        <View style={styles.grid}>
          {/* Storage Saved */}
          <View style={[styles.card, styles.cardLarge]}>
            <View style={styles.cardIcon}>
              <MaterialIcons name="storage" size={24} color={Colors.primary} />
            </View>
            <View style={styles.cardValueContainer}>
              <Text style={styles.cardValue}>
                {formatMB(stats.totalMBFreed)}
              </Text>
              <Text style={styles.cardLabel}>Storage Freed</Text>
            </View>
          </View>

          {/* Deleted Count */}
          <View style={styles.card}>
            <View style={styles.cardIcon}>
              <MaterialIcons
                name="delete-outline"
                size={20}
                color={Colors.danger}
              />
            </View>
            <Text style={styles.cardValueSmall}>{stats.totalDeleted}</Text>
            <Text style={styles.cardLabel}>Spam Removed</Text>
          </View>

          {/* Total Flagged */}
          <View style={styles.card}>
            <View style={styles.cardIcon}>
              <MaterialIcons
                name="flag"
                size={20}
                color={Colors.warningOrange}
              />
            </View>
            <Text style={styles.cardValueSmall}>{stats.totalFlagged}</Text>
            <Text style={styles.cardLabel}>Items Flagged</Text>
          </View>

          {/* Scans Run */}
          <View style={[styles.card, styles.cardWide]}>
            <View style={styles.cardIcon}>
              <MaterialIcons name="radar" size={20} color={Colors.textMuted} />
            </View>
            <View style={styles.cardWideText}>
              <Text style={styles.cardLabel}>Total Images Scanned</Text>
              <Text style={styles.cardValueSmall}>{stats.totalScanned}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* UndoSnackbar is rendered in the tab layout to avoid duplicate timers */}
      <BottomNav activeTab="stats" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bgBase,
  },
  content: {
    padding: 24,
    paddingBottom: 132,
  },
  pageHeader: {
    marginBottom: 32,
    gap: 8,
  },
  title: {
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 28,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.textSecondary,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  card: {
    backgroundColor: Colors.bgSurface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    width: "47.5%",
    gap: 12,
  },
  cardLarge: {
    width: "100%",
    padding: 24,
    backgroundColor: "rgba(13, 118, 110, 0.08)",
    borderColor: "rgba(13, 118, 110, 0.2)",
  },
  cardWide: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: 24,
  },
  cardWideText: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginLeft: 12,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(15, 23, 42, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardValueContainer: {
    gap: 4,
  },
  cardValue: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 40,
    color: Colors.primary,
    letterSpacing: -1,
  },
  cardValueSmall: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 24,
    color: Colors.textPrimary,
  },
  cardLabel: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
