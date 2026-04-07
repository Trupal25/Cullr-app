import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../theme";

type TabKey = "home" | "stats" | "settings";

type BottomNavProps = {
  activeTab?: TabKey;
};

const TABS: {
  key: TabKey;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  route: string;
}[] = [
  { key: "home", icon: "home", label: "Home", route: "/(tabs)" },
  { key: "stats", icon: "bar-chart", label: "Stats", route: "/(tabs)/stats" },
  {
    key: "settings",
    icon: "settings",
    label: "Settings",
    route: "/(tabs)/settings",
  },
];

export function BottomNav({
  activeTab = "home",
}: BottomNavProps): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 10);

  const handlePress = (tab: TabKey, route: string): void => {
    if (tab === activeTab) return; // already here
    router.push(route as Parameters<typeof router.push>[0]);
  };

  return (
    <View style={[styles.wrapper, { bottom: bottomOffset }]}>
      <View style={styles.container}>
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <Pressable
              key={tab.key}
              onPress={() => handlePress(tab.key, tab.route)}
              style={({ pressed }) => [
                styles.tab,
                isActive && styles.tabActive,
                pressed && styles.tabPressed,
              ]}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <MaterialIcons
                name={tab.icon}
                size={21}
                color={isActive ? Colors.primary : Colors.textMuted}
              />
              <Text
                style={[styles.tabLabel, isActive && styles.tabLabelActive]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 20,
    alignItems: "center",
  },
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    maxWidth: 430,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    shadowColor: "#020617",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 10,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: 52,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  tabActive: {
    backgroundColor: "rgba(13, 118, 110, 0.14)",
  },
  tabPressed: {
    opacity: 0.72,
  },
  tabLabel: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: Colors.textMuted,
  },
  tabLabelActive: {
    color: Colors.primary,
  },
});
