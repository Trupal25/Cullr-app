import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';
import { useScanStore } from '../src/store/scan-store';
import { formatMB } from '../src/services/scan-orchestrator';
import { Colors } from '../src/theme';

export default function DeleteConfirmScreen(): React.JSX.Element {
  const router = useRouter();
  const { state, removeDeleted, updateStats } = useScanStore();
  const [deleting, setDeleting] = useState(false);

  const selectedResults = useMemo(
    () => state.scanResults.filter((r) => state.selectedIds.has(r.asset.id)),
    [state.scanResults, state.selectedIds]
  );

  const selectedCount = selectedResults.length;
  const selectedBytes = useMemo(
    () => selectedResults.reduce((sum, r) => sum + r.asset.fileSize, 0),
    [selectedResults]
  );

  const handleDelete = async (): Promise<void> => {
    if (deleting || selectedCount === 0) return;

    setDeleting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    try {
      const assetIds = selectedResults.map((r) => r.asset.id);
      const success = await MediaLibrary.deleteAssetsAsync(assetIds);

      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        removeDeleted(assetIds);
        updateStats({
          totalDeleted: state.stats.totalDeleted + selectedCount,
          totalMBFreed: state.stats.totalMBFreed + selectedBytes / (1024 * 1024),
        });
        router.back();
      } else {
        Alert.alert('Delete Failed', 'Some images could not be deleted. They may be in a protected album.');
        setDeleting(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong while deleting images.');
      setDeleting(false);
    }
  };

  const handleCancel = (): void => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.overlay}>
        <View style={styles.ghostGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={styles.ghostCell} />
          ))}
        </View>
      </View>

      <View style={styles.sheetContainer}>
        <View style={styles.sheet}>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          <View style={styles.sheetContent}>
            <View style={styles.trashIconContainer}>
              <MaterialIcons name="delete" size={24} color={Colors.danger} />
            </View>

            <Text style={styles.headline}>
              Delete {selectedCount} image{selectedCount !== 1 ? 's' : ''}?
            </Text>

            <Text style={styles.bodyText}>
              Permanently removes them from your gallery and iCloud. This cannot be undone.
            </Text>

            <View style={styles.statRow}>
              <View style={styles.statChip}>
                <Text style={styles.statText}>{formatMB(selectedBytes)} freed</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statText}>{selectedCount} files</Text>
              </View>
            </View>

            <View style={styles.actions}>
              <Pressable
                onPress={handleDelete}
                disabled={deleting}
                style={({ pressed }) => [
                  styles.deleteButton,
                  pressed && styles.deleteButtonPressed,
                  deleting && styles.deleteButtonDisabled,
                ]}
              >
                <Text style={styles.deleteButtonText}>
                  {deleting ? 'Deleting...' : 'Delete Permanently'}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleCancel}
                disabled={deleting}
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
  trashIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.trashIconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
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
  deleteButtonDisabled: {
    opacity: 0.5,
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
