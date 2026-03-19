import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme';

type HeaderProps = {
  onMenuPress?: () => void;
  onSearchPress?: () => void;
};

export function Header({ onMenuPress, onSearchPress }: HeaderProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.inner}>
        <Pressable onPress={onMenuPress} style={styles.iconButton}>
          <MaterialIcons name="menu" size={24} color={Colors.primary} />
        </Pressable>

        <Text style={styles.logo}>cullr</Text>

        <Pressable onPress={onSearchPress} style={styles.iconButton}>
          <MaterialIcons name="search" size={24} color={Colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(49, 54, 53, 0.3)',
  },
  inner: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  iconButton: {
    padding: 8,
  },
  logo: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    color: Colors.textPrimary,
    letterSpacing: -1,
    textTransform: 'lowercase',
  },
});
