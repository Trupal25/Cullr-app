import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomNav } from "../../src/components/bottom-nav";
import { Header } from "../../src/components/header";
import { useScanStore } from "../../src/store/scan-store";
import { Colors } from "../../src/theme";

export default function SettingsScreen(): React.JSX.Element {
  const { updateStats } = useScanStore();
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  const handleResetStats = () => {
    Alert.alert(
      "Reset Stats?",
      "This will clear your all-time storage saved and scans run. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            updateStats({
              lastScanDate: null,
              totalScanned: 0,
              totalFlagged: 0,
              totalDeleted: 0,
              totalMBFreed: 0,
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <Header />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.pageHeader}>
          <Text style={styles.title}>Settings</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PREFERENCES</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <MaterialIcons
                name="vibration"
                size={20}
                color={Colors.textPrimary}
              />
              <View>
                <Text style={styles.settingLabel}>Haptic Feedback</Text>
                <Text style={styles.settingDesc}>Vibrate on actions</Text>
              </View>
            </View>
            <Switch
              value={hapticsEnabled}
              onValueChange={setHapticsEnabled}
              trackColor={{
                false: Colors.surfaceContainerHighest,
                true: Colors.primaryContainer,
              }}
              thumbColor={Colors.surface}
              ios_backgroundColor={Colors.surfaceContainerHighest}
            />
          </View>
          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <MaterialIcons
                name="psychology"
                size={20}
                color={Colors.textMuted}
              />
              <View>
                <Text style={styles.settingLabel}>ML Model Detection</Text>
                <Text style={styles.settingDesc}>Coming soon to Cullr Pro</Text>
              </View>
            </View>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DATA & PRIVACY</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <MaterialIcons
                name="privacy-tip"
                size={20}
                color={Colors.textPrimary}
              />
              <View>
                <Text style={styles.settingLabel}>On-Device Scanning</Text>
                <Text style={styles.settingDesc}>
                  Photos never leave your device
                </Text>
              </View>
            </View>
            <MaterialIcons
              name="check"
              size={20}
              color={Colors.primaryContainer}
            />
          </View>
          <View style={styles.divider} />

          <Pressable
            style={({ pressed }) => [
              styles.settingRow,
              pressed && styles.settingRowPressed,
            ]}
            onPress={handleResetStats}
          >
            <View style={styles.settingInfo}>
              <MaterialIcons
                name="delete-forever"
                size={20}
                color={Colors.danger}
              />
              <View>
                <Text style={[styles.settingLabel, { color: Colors.danger }]}>
                  Reset All-Time Stats
                </Text>
                <Text style={styles.settingDesc}>
                  Clear your impact history
                </Text>
              </View>
            </View>
          </Pressable>
        </View>

        <Text style={styles.versionText}>Cullr v1.0.0</Text>
      </ScrollView>

      <BottomNav activeTab="settings" />
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
  },
  title: {
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 28,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  section: {
    marginBottom: 32,
    backgroundColor: Colors.bgSurface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 2,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  settingRowPressed: {
    backgroundColor: "rgba(15, 23, 42, 0.05)",
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  settingLabel: {
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 15,
    color: Colors.textPrimary,
  },
  settingDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 56, // Align with text
  },
  proBadge: {
    backgroundColor: "rgba(15, 23, 42, 0.05)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  proBadgeText: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  versionText: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 16,
  },
});
