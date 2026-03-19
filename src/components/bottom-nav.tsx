import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme';

type TabKey = 'home' | 'scan' | 'ai' | 'settings';

type BottomNavProps = {
  activeTab?: TabKey;
  onTabPress?: (tab: TabKey) => void;
};

const TABS: { key: TabKey; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: 'home', icon: 'grid-view' },
  { key: 'scan', icon: 'qr-code-scanner' },
  { key: 'ai', icon: 'auto-awesome' },
  { key: 'settings', icon: 'settings' },
];

export function BottomNav({ activeTab = 'home', onTabPress }: BottomNavProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 20) }]}>
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onTabPress?.(tab.key)}
            style={[styles.tab, isActive && styles.tabActive]}
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
    backgroundColor: 'rgba(16, 20, 20, 0.7)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(49, 54, 53, 0.2)',
  },
  tab: {
    padding: 12,
    borderRadius: 9999,
  },
  tabActive: {
    backgroundColor: 'rgba(62, 207, 191, 0.1)',
  },
});
