import { MaterialIcons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../theme";

type TabKey = "home" | "stats" | "settings";

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

export function BottomNav(): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 10);
  const [tabLayouts, setTabLayouts] = useState<
    Partial<Record<TabKey, { x: number; width: number }>>
  >({});
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  const activeTab = useMemo<TabKey>(() => {
    if (pathname.endsWith("/stats")) return "stats";
    if (pathname.endsWith("/settings")) return "settings";
    return "home";
  }, [pathname]);

  const setTabLayout = useCallback((key: TabKey, x: number, width: number) => {
    setTabLayouts((previous) => {
      const current = previous[key];
      if (
        current &&
        Math.abs(current.x - x) < 0.5 &&
        Math.abs(current.width - width) < 0.5
      ) {
        return previous;
      }

      return {
        ...previous,
        [key]: { x, width },
      };
    });
  }, []);

  useEffect(() => {
    const activeLayout = tabLayouts[activeTab];
    if (!activeLayout) return;

    const horizontalInset = 4;
    const targetWidth = Math.max(activeLayout.width - horizontalInset * 2, 56);
    const targetX = activeLayout.x + (activeLayout.width - targetWidth) / 2;

    if (indicatorWidth.value === 0) {
      indicatorWidth.value = targetWidth;
      indicatorX.value = targetX;
      return;
    }

    indicatorWidth.value = withTiming(targetWidth, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
    indicatorX.value = withSpring(targetX, {
      stiffness: 230,
      damping: 22,
      mass: 0.7,
    });
  }, [activeTab, indicatorWidth, indicatorX, tabLayouts]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
    opacity: indicatorWidth.value > 0 ? 1 : 0,
  }));

  const handlePress = (tab: TabKey, route: string): void => {
    if (tab === activeTab) return; // already here
    router.replace(route as Parameters<typeof router.replace>[0]);
  };

  return (
    <View style={[styles.wrapper, { bottom: bottomOffset }]}>
      <View style={styles.container}>
        <Animated.View
          pointerEvents="none"
          style={[styles.activeIndicator, indicatorStyle]}
        />
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <Pressable
              key={tab.key}
              onPress={() => handlePress(tab.key, tab.route)}
              onLayout={(event) => {
                const { x, width } = event.nativeEvent.layout;
                setTabLayout(tab.key, x, width);
              }}
              style={({ pressed }) => [
                styles.tab,
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
    justifyContent: "flex-start",
    alignItems: "center",
    width: "100%",
    maxWidth: 430,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    overflow: "hidden",
    shadowColor: "#020617",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 10,
  },
  activeIndicator: {
    position: "absolute",
    left: 0,
    top: 6,
    bottom: 6,
    borderRadius: 999,
    backgroundColor: "rgba(13, 118, 110, 0.16)",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: 50,
    paddingHorizontal: 12,
    borderRadius: 999,
    zIndex: 1,
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
