import React, { useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Dimensions,
  FlatList,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Header } from '../../src/components/header';
import { UndoSnackbar } from '../../src/components/undo-snackbar';
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
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BADGE_COLORS: Record<ConfidenceLevel, string> = {
  HIGH: Colors.danger,
  MEDIUM: Colors.warningOrange,
  LOW: Colors.outline,
  CLEAN: 'transparent',
};

const ViewerImageItem = React.memo(({ item }: { item: ScoredResult }) => {
  const [loading, setLoading] = React.useState(true);
  
  return (
    <View style={styles.viewerPage}>
      {loading && (
        <ActivityIndicator 
          size="large" 
          color={Colors.primary} 
          style={StyleSheet.absoluteFillObject} 
        />
      )}
      <Image
        source={{ uri: item.asset.uri }}
        style={styles.viewerImage}
        contentFit="contain"
        transition={150}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
      />
    </View>
  );
});

export default function ResultsScreen(): React.JSX.Element {
  const router = useRouter();
  const { state, toggleSelect, selectAll, deselectAll } = useScanStore();
  const [activeFilter, setActiveFilter] = React.useState<ConfidenceLevel | 'ALL'>('ALL');

  const isSourceMode = state.lastScanType === 'source';
  const [viewerIndex, setViewerIndex] = React.useState<number>(-1);
  const viewerListRef = useRef<FlatList>(null);
  const [isSharing, setIsSharing] = React.useState(false);

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

  const handleSelectAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    selectAll();
  }, [selectAll]);

  const handleDelete = useCallback(() => {
    if (selectedCount === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push('/delete-confirm');
  }, [selectedCount, router]);

  const handleShare = useCallback(async (item: ScoredResult) => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      await Share.share(
        { url: item.asset.uri, title: 'Share image from Cullr' },
        { dialogTitle: 'Share this image' }
      );
    } catch {
      // User cancelled — that's fine
    } finally {
      setIsSharing(false);
    }
  }, [isSharing]);

  const openViewer = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setViewerIndex(index);
  }, []);

  const closeViewer = useCallback(() => {
    setViewerIndex(-1);
  }, []);

  const onViewerScrollEnd = useCallback((e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setViewerIndex(newIndex);
  }, []);

  const viewerItem = viewerIndex >= 0 ? filteredItems[viewerIndex] : null;

  const renderItem = useCallback(({ item, index }: { item: ScoredResult; index: number }) => {
    const isSelected = state.selectedIds.has(item.asset.id);
    return (
      <Pressable
        onPress={() => openViewer(index)}
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
        
        {/* Dedicated selection hotspot */}
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
  }, [state.selectedIds, handleToggle, openViewer]);

  const renderViewerPage = useCallback(({ item }: { item: ScoredResult }) => {
    return <ViewerImageItem item={item} />;
  }, []);

  const getViewerItemLayout = useCallback((_data: unknown, index: number) => ({
    length: SCREEN_WIDTH,
    offset: SCREEN_WIDTH * index,
    index,
  }), []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <Header />

      <View style={styles.summaryStrip}>
        <Text style={styles.summaryTitle}>
          {totalItems} {isSourceMode ? 'image' : 'spam image'}{totalItems !== 1 ? 's' : ''}
          {isSourceMode ? ' from messaging apps' : ''}
        </Text>
        <Text style={styles.summarySubtitle}>
          {formatMB(totalBytes)} · tap to preview · long-press to select
        </Text>
      </View>

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

      <View style={styles.gridContainer}>
        <FlashList
          data={filteredItems}
          renderItem={renderItem}
          numColumns={COLUMN_COUNT}
          keyExtractor={(item) => item.asset.id}
        />
      </View>

      <View style={styles.actionBar}>
        <Pressable 
          onPress={selectedCount === totalItems ? deselectAll : handleSelectAll} 
          style={styles.deselectButton}
        >
          <Text style={styles.deselectText}>
            {selectedCount === totalItems ? 'Deselect All' : 'Select All'}
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
          <Text style={styles.deleteButtonText}>
            Delete {selectedCount} Image{selectedCount !== 1 ? 's' : ''}
          </Text>
        </Pressable>
      </View>

      {selectedCount > 0 && (
        <View style={styles.selectionPill}>
          <View style={styles.pulseDot} />
          <Text style={styles.selectionPillText}>
            {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
          </Text>
        </View>
      )}

      {/* ── Full-Screen Image Viewer with Swipe ── */}
      <Modal
        visible={viewerIndex >= 0}
        transparent
        animationType="fade"
        onRequestClose={closeViewer}
        statusBarTranslucent
      >
        {viewerIndex >= 0 && (
          <View style={styles.viewerContainer}>
            {/* Swipeable image carousel */}
            <FlatList
              ref={viewerListRef}
              data={filteredItems}
              renderItem={renderViewerPage}
              keyExtractor={(item) => `viewer-${item.asset.id}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={viewerIndex}
              getItemLayout={getViewerItemLayout}
              onMomentumScrollEnd={onViewerScrollEnd}
              bounces={false}
              windowSize={3}
              maxToRenderPerBatch={1}
            />

            {/* Top Bar — close + counter */}
            <View style={styles.viewerTopbar}>
              <View style={styles.viewerCounter}>
                <Text style={styles.viewerCounterText}>
                  {viewerIndex + 1} / {filteredItems.length}
                </Text>
              </View>
              <Pressable
                onPress={closeViewer}
                style={styles.viewerCloseBtn}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <MaterialIcons name="close" size={28} color="#FFF" />
              </Pressable>
            </View>

            {/* Swipe hint */}
            {filteredItems.length > 1 && (
              <View style={styles.swipeHint} pointerEvents="none">
                <MaterialIcons name="swipe" size={16} color="rgba(255,255,255,0.4)" />
                <Text style={styles.swipeHintText}>Swipe to browse</Text>
              </View>
            )}
            
            {/* Bottom Bar — info + actions */}
            {viewerItem && (
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

                <View style={styles.viewerActions}>
                  {/* Share Button */}
                  <Pressable
                    onPress={() => handleShare(viewerItem)}
                    style={({ pressed }) => [
                      styles.viewerActionBtn,
                      pressed && styles.viewerActionBtnPressed,
                    ]}
                    disabled={isSharing}
                  >
                    <MaterialIcons
                      name={isSharing ? 'hourglass-top' : 'share'}
                      size={20}
                      color="#FFF"
                    />
                    <Text style={styles.viewerActionText}>
                      {isSharing ? 'Sharing...' : 'Share'}
                    </Text>
                  </Pressable>

                  {/* Select/Deselect Button */}
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
          </View>
        )}
      </Modal>

      {/* ── Undo Snackbar (floats over the results grid) ── */}
      <UndoSnackbar />
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
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
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
    paddingBottom: 5,
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
    opacity: 1,
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
    backgroundColor: 'rgba(13, 118, 110, 0.12)',
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
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },
  checkmarkUnselected: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  selectionPill: {
    position: 'absolute',
    bottom: 110, // Higher up to sit clearly above the action bar
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.bgSurface,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  selectionPillText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: Colors.primary,
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
  
  // ── Viewer Modal ──
  viewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.97)',
  },
  viewerPage: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: {
    width: '100%',
    height: '100%',
  },
  viewerTopbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  viewerCounter: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  viewerCounterText: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 1,
  },
  viewerCloseBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 22,
  },
  swipeHint: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 9999,
    marginTop: 120,
    opacity: 0.6,
  },
  swipeHintText: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  viewerBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingHorizontal: 24,
    paddingTop: 32,
    backgroundColor: 'rgba(0,0,0,0.7)',
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
  viewerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  viewerActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  viewerActionBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  viewerActionText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#FFF',
  },
  viewerSelectBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  viewerSelectBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(13, 118, 110, 0.15)',
  },
  viewerSelectText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#FFF',
  },
  viewerSelectTextActive: {
    color: Colors.primary,
  },
});
