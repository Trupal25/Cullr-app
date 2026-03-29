import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../theme';

export function Header(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNav = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMenuOpen(false);
    router.push(route as any);
  };

  return (
    <>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.inner}>
          {/* Left — burger menu */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setMenuOpen(true);
            }}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.iconButtonPressed,
            ]}
            hitSlop={8}
          >
            <MaterialIcons name="menu" size={24} color={Colors.textMuted} />
          </Pressable>

          {/* Center — logo */}
          <Text style={styles.logo}>cullr</Text>

          {/* Right — spacer to keep logo centered */}
          <View style={styles.iconButton} />
        </View>
      </View>

      {/* Dropdown Menu Modal */}
      <Modal visible={menuOpen} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setMenuOpen(false)}>
          <View style={[styles.modalOverlay, { paddingTop: insets.top + 56 }]}>
            <TouchableWithoutFeedback>
              <View style={styles.menuBox}>
                <Pressable style={styles.menuItem} onPress={() => handleNav('/(tabs)')}>
                  <MaterialIcons name="home" size={20} color={Colors.textPrimary} />
                  <Text style={styles.menuText}>Home</Text>
                </Pressable>
                <Pressable style={styles.menuItem} onPress={() => handleNav('/(tabs)/stats')}>
                  <MaterialIcons name="bar-chart" size={20} color={Colors.textPrimary} />
                  <Text style={styles.menuText}>Stats</Text>
                </Pressable>
                <Pressable style={styles.menuItem} onPress={() => handleNav('/(tabs)/settings')}>
                  <MaterialIcons name="settings" size={20} color={Colors.textPrimary} />
                  <Text style={styles.menuText}>Settings</Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  inner: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  iconButtonPressed: {
    backgroundColor: 'rgba(13, 118, 110, 0.08)', // new deeper primary teal with opacity
  },
  logo: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    color: Colors.textPrimary,
    letterSpacing: -1,
    textTransform: 'lowercase',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
  },
  menuBox: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 12,
    paddingVertical: 8,
    width: 180,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuText: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 15,
    color: Colors.textPrimary,
  },
});
