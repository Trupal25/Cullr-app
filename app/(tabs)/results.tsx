import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Share, Platform } from 'react-native';
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
  const { state, toggleSelect, selectAll, deselectAll } = useScanStore();
  const [activeFilter, setActiveFilter] = React.useState<ConfidenceLevel | 'ALL'>('ALL');

  const isSourceMode = state.lastScanType === 'source';
  const [viewerIndex, setViewerIndex] = React.useState<number | null>(null);

  const filteredItems = useMemo(() => {
    if (activeFilter === 'ALL') return state.scanResults;
    return state.scanResults.filter((item) => item.confidence === activeFilter);
  }, [state.scanResults, activeFilter]);

  const totalItems = state.scanResults.length;
  const selectedCount = state.selectedIds.size;
  const totalBytes = useMemo(() => computeTotalBytes(state.scanResults), [state.scanResults]);

  // Viewer helpers
  const viewerItem = viewerIndex !== null ? filteredItems[viewerIndex] ?? null : null;
  const canGoPrev = viewerIndex !== null && viewerIndex > 0;
  const canGoNext = viewerIndex !== null && viewerIndex < filteredItems.length - 1;

  const handleToggle = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleSelect(id);
  }, [toggleSelect]);

  const handleDelete = useCallback(() => {
    if (selectedCount === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push('/delete-confirm');
  }, [selectedCount, router]);

  const handleSelectAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    selectAll();
  }, [selectAll]);

  const handleShare = useCallback(async (uri: string) => {
    try {
      await Share.share(
        Platform.OS === 'ios'
          ? { url: uri }
          : { message: uri }
      );
    } catch {
      // User cancelled — no action needed
    }
  }, []);

  const renderItem = useCallback(({ item, index }: { item: ScoredResult; index: number }) => {
    const isSelected = state.selectedIds.has(item.asset.id);
    return (
      <Pressable
        onPress={() => setViewerIndex(index)}
        onLongPress={() => handleToggle(item.asset.id)}
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

        {/* Selection circle */}
        <Pressable
          style={styles.selectHotspot}
          onPress={() => handleToggle(item.asset.id)}
          hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
        >
          <View style={[styles.checkmark, !isSelected && styles.checkmarkUnselected]}>
            {isSelected && <MaterialIcons name="check" size={14} color={Colors.bgBase} />}
          </View>
        </Pressable>

        {isSelected && <View style={styles.selectionOverlay} pointerEvents="none" />}
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
          {formatMB(totalBytes)} · tap to preview · long press to select
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
            {selectedCount}/{totalItems} selected
          </Text>
        </View>
      )}

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <Pressable
          onPress={selectedCount === totalItems ? deselectAll : handleSelectAll}
          style={styles.selectAllButton}
        >
          <MaterialIcons
            name={selectedCount === totalItems ? 'deselect' : 'select-all'}
            size={18}
            color={Colors.textMuted}
          />
          <Text style={styles.selectAllText}>
            {selectedCount === totalItems ? 'Deselect' : 'Select All'}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleDelete}
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.deleteButtonPressed,
            selectedCount === 0 && styles.deleteButtonDisabled,
          ]}
        >
          <MaterialIcons name="delete-outline" size={18} color="#FFF" />
          <Text style={styles.deleteButtonText}>
            Delete{selectedCount > 0 ? ` ${selectedCount}` : ''}
          </Text>
        </Pressable>
      </View>

      {/* ── Full-Screen Viewer Modal ── */}
      <Modal
        visible={viewerIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerIndex(null)}
      >
        {viewerItem && (
          <View style={styles.viewerContainer}>
            <Image
              source={{ uri: viewerItem.asset.uri }}
              style={styles.viewerImage}
              contentFit="contain"
            />

            {/* Top Bar */}
            <View style={styles.viewerTopbar}>
              <Pressable
                onPress={() => setViewerIndex(null)}
                style={styles.viewerIconBtn}
                hitSlop={20}
              >
                <MaterialIcons name="close" size={24} color="#FFF" />
              </Pressable>

              <Text style={styles.viewerCounter}>
                {(viewerIndex ?? 0) + 1} / {filteredItems.length}
              </Text>

              <Pressable
                onPress={() => handleShare(viewerItem.asset.uri)}
                style={styles.viewerIconBtn}
                hitSlop={20}
              >
                <MaterialIcons name="share" size={22} color="#FFF" />
              </Pressable>
            </View>

            {/* Prev / Next Navigation */}
            <View style={styles.viewerNav} pointerEvents="box-none">
              <Pressable
                onPress={() => canGoPrev && setViewerIndex((viewerIndex ?? 1) - 1)}
                style={[styles.viewerArrow, !canGoPrev && styles.viewerArrowDisabled]}
                disabled={!canGoPrev}
                hitSlop={20}
              >
                <MaterialIcons name="chevron-left" size={32} color="#FFF" />
              </Pressable>
              <Pressable
                onPress={() => canGoNext && setViewerIndex((viewerIndex ?? 0) + 1)}
                style={[styles.viewerArrow, !canGoNext && styles.viewerArrowDisabled]}
                disabled={!canGoNext}
                hitSlop={20}
              >
                <MaterialIcons name="chevron-right" size={32} color="#FFF" />
              </Pressable>
            </View>

            {/* Bottom Bar */}
            <View style={styles.viewerBottomBar}>
              <View style={styles.viewerInfo}>
                <Text style={styles.viewerInfoText}>
                  {formatMB(viewerItem.asset.fileSize)} · {viewerItem.asset.width}×{viewerItem.asset.height}
                </Text>
                {viewerItem.reasons.length > 0 && (
                  <Text style={styles.viewerReasonText} numberOfLines={2}>
                    {viewerItem.reasons.join(' · ')}
                  </Text>
                )}
              </View>

              <Pressable
                onPress={() => handleToggle(viewerItem.asset.id)}
                style={[
                  styles.viewerSelectBtn,
                  state.selectedIds.has(viewerItem.asset.id) && styles.viewerSelectBtnActive,
                ]}
              >
                <MaterialIcons
                  name={state.selectedIds.has(viewerItem.asset.id) ? 'check-circle' : 'radio-button-unchecked'}
                  size={22}
                  color={state.selectedIds.has(viewerItem.asset.id) ? Colors.primaryContainer : '#FFF'}
                />
                <Text
                  style={[
                    styles.viewerSelectText,
                    state.selectedIds.has(viewerItem.asset.id) && styles.viewerSelectTextActive,
                  ]}
                >
                  {state.selectedIds.has(viewerItem.asset.id) ? 'Selected' : 'Select'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },

  // ── Summary ──
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

  // ── Filters ──
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

  // ── Grid ──
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
  selectHotspot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    padding: 2,
  },
  checkmark: {
    width: 20,
    height: 20,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  checkmarkUnselected: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },

  // ── Selection Pill ──
  selectionPill: {
    position: 'absolute',
    bottom: 96,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(49, 54, 53, 0.85)',
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
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.onSurfaceVariant,
  },

  // ── Action Bar ──
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
  selectAllButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  selectAllText: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  deleteButton: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: Colors.danger,
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

  // ── Viewer Modal ──
  viewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  viewerImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  viewerTopbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 10,
  },
  viewerIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerCounter: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 1,
  },
  viewerNav: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  viewerArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerArrowDisabled: {
    opacity: 0.25,
  },
  viewerBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingHorizontal: 24,
    paddingTop: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    gap: 16,
  },
  viewerInfo: {
    gap: 4,
  },
  viewerInfoText: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 1,
  },
  viewerReasonText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 18,
  },
  viewerSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  viewerSelectBtnActive: {
    borderColor: Colors.primaryContainer,
    backgroundColor: 'rgba(62, 207, 191, 0.1)',
  },
  viewerSelectText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#FFF',
  },
  viewerSelectTextActive: {
    color: Colors.primaryContainer,
  },
});
