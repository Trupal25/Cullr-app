import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Header } from '../../src/components/header';
import { Colors } from '../../src/theme';

type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

type GridItem = {
  id: string;
  image: number;
  confidence: ConfidenceLevel;
};

const GRID_ITEMS: GridItem[] = [
  { id: '1', image: require('../../assets/images/grid/grid-1.jpg'), confidence: 'HIGH' },
  { id: '2', image: require('../../assets/images/grid/grid-2.jpg'), confidence: 'MEDIUM' },
  { id: '3', image: require('../../assets/images/grid/grid-3.jpg'), confidence: 'HIGH' },
  { id: '4', image: require('../../assets/images/grid/grid-4.jpg'), confidence: 'MEDIUM' },
  { id: '5', image: require('../../assets/images/grid/grid-5.jpg'), confidence: 'NONE' },
  { id: '6', image: require('../../assets/images/grid/grid-6.jpg'), confidence: 'NONE' },
  { id: '7', image: require('../../assets/images/grid/grid-7.jpg'), confidence: 'NONE' },
  { id: '8', image: require('../../assets/images/grid/grid-8.jpg'), confidence: 'MEDIUM' },
  { id: '9', image: require('../../assets/images/grid/grid-9.jpg'), confidence: 'NONE' },
];

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
  NONE: 'transparent',
};

export default function ResultsScreen(): React.JSX.Element {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<ConfidenceLevel | 'ALL'>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(['1', '3', '6']));

  const filteredItems = activeFilter === 'ALL'
    ? GRID_ITEMS
    : GRID_ITEMS.filter((item) => item.confidence === activeFilter);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleDelete = useCallback(() => {
    router.push('/delete-confirm');
  }, [router]);

  const totalItems = GRID_ITEMS.length;
  const selectedCount = selectedIds.size;

  const renderItem = useCallback(({ item }: { item: GridItem }) => {
    const isSelected = selectedIds.has(item.id);
    return (
      <Pressable
        onPress={() => toggleSelection(item.id)}
        style={[styles.gridCell, isSelected && styles.gridCellSelected]}
      >
        <Image
          source={item.image}
          style={styles.gridImage}
          contentFit="cover"
          transition={200}
        />
        {item.confidence !== 'NONE' && (
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
  }, [selectedIds, toggleSelection]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <Header />

      {/* Summary Strip */}
      <View style={styles.summaryStrip}>
        <Text style={styles.summaryTitle}>
          {totalItems} spam images
        </Text>
        <Text style={styles.summarySubtitle}>142 MB · tap to select</Text>
      </View>

      {/* Filters */}
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

      {/* Grid */}
      <View style={styles.gridContainer}>
        <FlashList
          data={filteredItems}
          renderItem={renderItem}
          numColumns={COLUMN_COUNT}
          keyExtractor={(item) => item.id}
        />
      </View>

      {/* Selection Status Pill */}
      {selectedCount > 0 && (
        <View style={styles.selectionPill}>
          <View style={styles.pulseDot} />
          <Text style={styles.selectionPillText}>
            Selection Active: {selectedCount}/{totalItems} items
          </Text>
        </View>
      )}

      {/* Bottom Action Bar */}
      <View style={styles.actionBar}>
        <Pressable onPress={deselectAll} style={styles.deselectButton}>
          <Text style={styles.deselectText}>Deselect All</Text>
        </Pressable>
        <Pressable
          onPress={handleDelete}
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.deleteButtonPressed,
          ]}
        >
          <Text style={styles.deleteButtonText}>
            Delete {selectedCount} Images
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

  // Summary
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

  // Filters
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

  // Grid
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

  // Selection Pill
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

  // Action Bar
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
  deleteButtonText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#FFFFFF',
  },
});
