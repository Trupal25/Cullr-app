import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme';

type TabKey = 'home' | 'scan' | 'ai' | 'settings';

type BottomNavProps = {
  activeTab?: TabKey;
};

const TABS: { key: TabKey; icon: keyof typeof MaterialIcons.glyphMap; route: string }[] = [
  { key: 'home',     icon: 'grid-view',        route: '/(tabs)' },
  { key: 'scan',     icon: 'qr-code-scanner',  route: '/(tabs)' },
  { key: 'ai',       icon: 'auto-awesome',     route: '/(tabs)' },
  { key: 'settings', icon: 'settings',         route: '/(tabs)' },
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
              size={24}
              color={isActive ? Colors.primary : Colors.textMuted}
            />
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
    paddingTop: 12,
    backgroundColor: 'rgba(16, 20, 20, 0.95)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(49, 54, 53, 0.4)',
  },
  tab: {
    padding: 12,
    borderRadius: 9999,
  },
  tabActive: {
    backgroundColor: 'rgba(62, 207, 191, 0.1)',
  },
  tabPressed: {
    opacity: 0.6,
  },
});
