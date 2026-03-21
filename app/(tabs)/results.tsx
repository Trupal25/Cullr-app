import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Header } from '../../src/components/header';
import { useScanStore } from '../../src/store/scan-store';
import { computeTotalBytes, formatMB } from '../../src/services/scan-orchestrator';
import { Colors } from '../../src/theme';
import type { ConfidenceLevel, ScoredResult } from '../../src/types';

const FILTERS: { key: ConfidenceLevel | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'HIGH', label: 'High' },
  { key: 'MEDIUM', label: 'Medium' },
  { key: 'LOW', label: 'Low' },
];

const COLUMN_COUNT = 3;

const BADGE_COLORS: Record<ConfidenceLevel, string> = {
  HIGH: Colors.danger,
  MEDIUM: Colors.warningOrange,
  LOW: Colors.outline,
  CLEAN: 'transparent',
};

export default function ResultsScreen(): React.JSX.Element {
  const router = useRouter();
  const { state, toggleSelect, deselectAll } = useScanStore();
  const [activeFilter, setActiveFilter] = React.useState<ConfidenceLevel | 'ALL'>('ALL');

  const isSourceMode = state.lastScanType === 'source';

  const filteredItems = useMemo(() => {
    if (activeFilter === 'ALL') return state.scanResults;
    return state.scanResults.filter((item) => item.confidence === activeFilter);
  }, [state.scanResults, activeFilter]);

  const totalItems = state.scanResults.length;
  const selectedCount = state.selectedIds.size;
  const totalBytes = useMemo(() => computeTotalBytes(state.scanResults), [state.scanResults]);

  const handleToggle = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleSelect(id);
  }, [toggleSelect]);

  const handleDelete = useCallback(() => {
    if (selectedCount === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push('/delete-confirm');
  }, [selectedCount, router]);

  const renderItem = useCallback(({ item }: { item: ScoredResult }) => {
    const isSelected = state.selectedIds.has(item.asset.id);
    return (
      <Pressable
        onPress={() => handleToggle(item.asset.id)}
        style={[styles.gridCell, isSelected && styles.gridCellSelected]}
      >
        <Image
          source={{ uri: item.asset.uri }}
          style={styles.gridImage}
          contentFit="cover"
          transition={200}
        />
        {item.confidence !== 'CLEAN' && (
          <View style={[styles.badge, { backgroundColor: BADGE_COLORS[item.confidence] }]}>
            <Text style={styles.badgeText}>{item.confidence}</Text>
          </View>
        )}
        {isSelected && (
          <>
            <View style={styles.selectionOverlay} />
            <View style={styles.checkmark}>
              <MaterialIcons name="check" size={14} color={Colors.bgBase} />
            </View>
          </>
        )}
      </Pressable>
    );
  }, [state.selectedIds, handleToggle]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <Header />

      <View style={styles.summaryStrip}>
        <Text style={styles.summaryTitle}>
          {totalItems} {isSourceMode ? 'image' : 'spam image'}{totalItems !== 1 ? 's' : ''}
          {isSourceMode ? ' from messaging apps' : ''}
        </Text>
        <Text style={styles.summarySubtitle}>
          {formatMB(totalBytes)} · tap to select
        </Text>
      </View>

      {!isSourceMode && (
      <View style={styles.filterRow}>
        {FILTERS.map((filter) => (
          <Pressable
            key={filter.key}
            onPress={() => setActiveFilter(filter.key)}
            style={[
              styles.filterChip,
              activeFilter === filter.key && styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === filter.key && styles.filterTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </View>
      )}

      <View style={styles.gridContainer}>
        <FlashList
          data={filteredItems}
          renderItem={renderItem}
          numColumns={COLUMN_COUNT}
          keyExtractor={(item) => item.asset.id}
        />
      </View>

      {selectedCount > 0 && (
        <View style={styles.selectionPill}>
          <View style={styles.pulseDot} />
          <Text style={styles.selectionPillText}>
            Selection Active: {selectedCount}/{totalItems} items
          </Text>
        </View>
      )}

      <View style={styles.actionBar}>
        <Pressable onPress={deselectAll} style={styles.deselectButton}>
          <Text style={styles.deselectText}>Deselect All</Text>
        </Pressable>
        <Pressable
          onPress={handleDelete}
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.deleteButtonPressed,
            selectedCount === 0 && styles.deleteButtonDisabled,
          ]}
        >
          <Text style={styles.deleteButtonText}>
            Delete {selectedCount} Image{selectedCount !== 1 ? 's' : ''}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  summaryStrip: {
    backgroundColor: Colors.bgSurface,
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 4,
  },
  summaryTitle: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 20,
    color: Colors.textPrimary,
  },
  summarySubtitle: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primaryContainer,
  },
  filterText: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: Colors.bgBase,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  gridContainer: {
    flex: 1,
    paddingHorizontal: 2,
    paddingBottom: 120,
  },
  gridCell: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: 1,
    overflow: 'hidden',
  },
  gridCellSelected: {
    borderWidth: 1.5,
    borderColor: Colors.primaryContainer,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    opacity: 0.7,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 9,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    textTransform: 'uppercase',
  },
  selectionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(62, 207, 191, 0.1)',
  },
  checkmark: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 20,
    height: 20,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  selectionPill: {
    position: 'absolute',
    bottom: 96,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(49, 54, 53, 0.7)',
    borderRadius: 9999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(60, 73, 71, 0.2)',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  selectionPillText: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.onSurfaceVariant,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    backgroundColor: Colors.sheetBg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  deselectButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deselectText: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  deleteButton: {
    flex: 1.5,
    paddingVertical: 12,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    borderRadius: 2,
  },
  deleteButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  deleteButtonDisabled: {
    opacity: 0.4,
  },
  deleteButtonText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#FFFFFF',
  },
});
