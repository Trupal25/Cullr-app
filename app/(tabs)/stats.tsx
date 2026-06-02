import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "../../src/components/header";
// UndoSnackbar is rendered once in the tab layout
import { formatMB } from "../../src/services/scan-orchestrator";
import { useScanStore } from "../../src/store/scan-store";
import { Colors } from "../../src/theme";

export default function StatsScreen(): React.JSX.Element {
  const { state } = useScanStore();
  const { stats } = state;
  const { width, fontScale } = useWindowDimensions();
  const useSingleColumnCards = width < 340 || fontScale > 1.2;
  const useStackedWideRow = width < 390 || fontScale > 1.1;

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <Header />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.pageHeader}>
          <Text style={styles.title}>Stats</Text>
          <Text style={styles.subtitle}>Scans and media removed</Text>
        </View>

        <View style={styles.grid}>
          {/* Removed media size */}
          <View style={[styles.card, styles.cardLarge]}>
            <View style={styles.cardIcon}>
              <MaterialIcons name="storage" size={24} color={Colors.primary} />
            </View>
            <View style={styles.cardValueContainer}>
              <Text style={styles.cardValue}>
                {formatMB(stats.totalMBFreed)}
              </Text>
              <Text style={styles.cardLabel}>Media Removed</Text>
            </View>
          </View>

          {/* Deleted Count */}
          <View
            style={[
              styles.card,
              useSingleColumnCards ? styles.cardFull : styles.cardHalf,
            ]}
          >
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
          <View
            style={[
              styles.card,
              useSingleColumnCards ? styles.cardFull : styles.cardHalf,
            ]}
          >
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
            <View
              style={[
                styles.cardWideText,
                useStackedWideRow && styles.cardWideTextStacked,
              ]}
            >
              <Text style={[styles.cardLabel, styles.cardWideLabel]}>
                Total Images Scanned
              </Text>
              <Text
                style={[
                  styles.cardValueSmall,
                  styles.cardWideValue,
                  useStackedWideRow && styles.cardWideValueStacked,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {stats.totalScanned}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
    gap: 12,
  },
  cardHalf: {
    width: "47%",
  },
  cardFull: {
    width: "100%",
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
    alignItems: "center",
    marginLeft: 12,
    gap: 12,
  },
  cardWideTextStacked: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 6,
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
  cardWideLabel: {
    flex: 1,
    flexShrink: 1,
  },
  cardWideValue: {
    flexShrink: 0,
    textAlign: "right",
  },
  cardWideValueStacked: {
    textAlign: "left",
  },
});
