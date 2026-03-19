import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../src/theme';

export default function DeleteConfirmScreen(): React.JSX.Element {
  const router = useRouter();

  const handleDelete = (): void => {
    router.back();
  };

  const handleCancel = (): void => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {/* Blurred Background Overlay */}
      <View style={styles.overlay}>
        <View style={styles.ghostGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={styles.ghostCell} />
          ))}
        </View>
      </View>

      {/* Bottom Sheet */}
      <View style={styles.sheetContainer}>
        <View style={styles.sheet}>
          {/* Drag Handle */}
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          {/* Content */}
          <View style={styles.sheetContent}>
            {/* Trash Icon */}
            <View style={styles.trashIconContainer}>
              <MaterialIcons name="delete" size={24} color={Colors.danger} />
            </View>

            {/* Headline */}
            <Text style={styles.headline}>Delete 18 images?</Text>

            {/* Body Text */}
            <Text style={styles.bodyText}>
              Permanently removes them from your gallery and iCloud. This cannot be undone.
            </Text>

            {/* Stat Row */}
            <View style={styles.statRow}>
              <View style={styles.statChip}>
                <Text style={styles.statText}>142 MB freed</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statText}>18 files</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <Pressable
                onPress={handleDelete}
                style={({ pressed }) => [
                  styles.deleteButton,
                  pressed && styles.deleteButtonPressed,
                ]}
              >
                <Text style={styles.deleteButtonText}>Delete Permanently</Text>
              </Pressable>
              <Pressable
                onPress={handleCancel}
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed && styles.cancelButtonPressed,
                ]}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Bottom Status Bar */}
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>System: Awaiting_Confirmation</Text>
          <Text style={styles.statusText}>Auth: Validated</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.bgBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostGrid: {
    width: '80%',
    maxWidth: 400,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    opacity: 0.2,
  },
  ghostCell: {
    width: '31.5%',
    aspectRatio: 1,
    backgroundColor: Colors.surfaceContainerHighest,
  },

  // Sheet
  sheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.sheetBg,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 24,
  },
  handleRow: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.handleBg,
  },
  sheetContent: {
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },

  // Trash Icon
  trashIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.trashIconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  // Text
  headline: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 24,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  bodyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: 28,
  },

  // Stats
  statRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  statChip: {
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statText: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },

  // Actions
  actions: {
    width: '100%',
    gap: 10,
  },
  deleteButton: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: Colors.dangerMuted,
    borderWidth: 1,
    borderColor: Colors.dangerBorder,
    alignItems: 'center',
  },
  deleteButtonPressed: {
    backgroundColor: 'rgba(224, 92, 92, 0.2)',
    transform: [{ scale: 0.98 }],
  },
  deleteButtonText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 16,
    color: Colors.danger,
    letterSpacing: -0.3,
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  cancelText: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 16,
    color: Colors.textMuted,
    letterSpacing: -0.3,
  },

  // Status Bar
  statusBar: {
    backgroundColor: Colors.surfaceContainerHigh,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(60, 73, 71, 0.1)',
  },
  statusText: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.onSecondaryContainer,
  },
});
