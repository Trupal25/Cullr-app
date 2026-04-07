import { MaterialIcons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMediaPermission } from "../src/hooks/use-permissions";
import { useScanStore } from "../src/store/scan-store";
import { Colors } from "../src/theme";

export default function OnboardingScreen(): React.JSX.Element {
  const router = useRouter();
  const { state, markOnboarded } = useScanStore();
  const { requestPermission } = useMediaPermission();
  const [loading, setLoading] = useState(false);

  // Already onboarded — skip this screen entirely
  if (state.isHydrated && state.isOnboarded) {
    return <Redirect href="/(tabs)" />;
  }

  const handleInitialize = async (): Promise<void> => {
    setLoading(true);
    const granted = await requestPermission();
    setLoading(false);

    if (!granted) {
      Alert.alert(
        "Permission Required",
        "Cullr needs photo access to scan your library.",
        [{ text: "OK" }],
      );
      return;
    }

    markOnboarded();
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.geometricSection}>
          <View style={styles.geometricContainer}>
            <View style={[styles.square, styles.square1]} />
            <View style={[styles.square, styles.square2]} />
            <View style={[styles.square, styles.square3]} />
            <View style={styles.centerIcon}>
              <MaterialIcons
                name="filter-center-focus"
                size={32}
                color={Colors.primary}
              />
            </View>
          </View>
        </View>

        <View style={styles.middleSection}>
          <View style={styles.heroText}>
            <Text style={styles.headline}>Meet Cullr.</Text>
            <Text style={styles.subtitle}>
              Find junk fast. Keep what matters.
            </Text>
          </View>

          <View style={styles.features}>
            <FeatureRow
              icon="auto-awesome-motion"
              title="Smart Groups"
              description="High, medium, and low spam risk."
            />
            <FeatureRow
              icon="visibility-off"
              title="Private"
              description="Runs on your device."
            />
            <FeatureRow
              icon="speed"
              title="Fast Cleanup"
              description="Review and clear clutter quickly."
            />
          </View>
        </View>

        <View style={styles.bottomSection}>
          <Pressable
            onPress={handleInitialize}
            disabled={loading}
            style={({ pressed }) => [
              styles.ctaButton,
              pressed && styles.ctaButtonPressed,
              loading && styles.ctaButtonDisabled,
            ]}
          >
            <Text style={styles.ctaText}>
              {loading ? "Allowing Access..." : "Allow Photos"}
            </Text>
          </Pressable>

          <View style={styles.trustSection}>
            <View style={styles.trustRow}>
              <MaterialIcons name="shield" size={14} color={Colors.textDark} />
              <Text style={styles.trustText}>
                On-device only. Nothing uploaded.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

type FeatureRowProps = {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
};

function FeatureRow({
  icon,
  title,
  description,
}: FeatureRowProps): React.JSX.Element {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIconWrap}>
        <MaterialIcons
          name={icon}
          size={24}
          color={Colors.onSecondaryContainer}
        />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  container: {
    flex: 1,
    paddingHorizontal: 32,
    paddingVertical: 24,
    justifyContent: "space-between",
  },
  geometricSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  geometricContainer: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  square: {
    position: "absolute",
    width: 140,
    height: 140,
    borderWidth: 1,
    borderColor: "rgba(13, 118, 110, 0.1)",
    borderRadius: 12,
  },
  square1: {
    transform: [{ rotate: "12deg" }],
  },
  square2: {
    transform: [{ rotate: "-6deg" }, { translateX: 12 }],
  },
  square3: {
    transform: [{ rotate: "45deg" }, { translateY: -6 }],
  },
  centerIcon: {
    backgroundColor: Colors.surfaceContainerLowest,
    padding: 20,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  middleSection: {
    flex: 1.5,
  },
  heroText: {
    marginBottom: 36,
  },
  headline: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 36,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Inter_300Light",
    fontSize: 18,
    color: Colors.onSurfaceVariant,
    lineHeight: 26,
  },
  features: {
    gap: 28,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  featureIconWrap: {
    marginTop: 2,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  featureDescription: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(55, 65, 81, 0.7)",
    lineHeight: 18,
  },
  bottomSection: {
    alignItems: "center",
    paddingTop: 24,
  },
  ctaButton: {
    width: "100%",
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#3ECFBF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 4,
  },
  ctaButtonPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: "rgba(13, 118, 110, 0.05)",
  },
  ctaButtonDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 14,
    color: Colors.onPrimary,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  trustSection: {
    marginTop: 24,
    alignItems: "center",
    gap: 12,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    opacity: 0.6,
  },
  trustText: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 11,
    color: Colors.textDark,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
