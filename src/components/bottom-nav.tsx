import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme';

type TabKey = 'home' | 'stats' | 'settings';

type BottomNavProps = {
  activeTab?: TabKey;
};

const TABS: { key: TabKey; icon: keyof typeof MaterialIcons.glyphMap; label: string; route: string }[] = [
  { key: 'home',     icon: 'home',        label: 'Home',     route: '/(tabs)' },
  { key: 'stats',    icon: 'bar-chart',   label: 'Stats',    route: '/(tabs)/stats' },
  { key: 'settings', icon: 'settings',    label: 'Settings', route: '/(tabs)/settings' },
];

export function BottomNav({ activeTab = 'home' }: BottomNavProps): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handlePress = (tab: TabKey, route: string): void => {
    if (tab === activeTab) return; // already here
    router.push(route as Parameters<typeof router.push>[0]);
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 20) }]}>
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
            hitSlop={8}
          >
            <MaterialIcons
              name={tab.icon}
              size={22}
              color={isActive ? Colors.primary : Colors.textMuted}
            />
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  tab: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: 'rgba(13, 118, 110, 0.1)',
  },
  tabPressed: {
    opacity: 0.6,
  },
  tabLabel: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  tabLabelActive: {
    color: Colors.primary,
  },
});
