import { MaterialIcons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "../src/components/header";
import { MediaViewer } from "../src/components/media-viewer";
import {
    deleteRecycleBinAssetsAsync,
    listRecycleBinAssetsAsync,
    restoreRecycleBinAssetsAsync,
    type RecycleBinAsset,
} from "../src/services/media-deletion";
import { formatMB } from "../src/services/scan-orchestrator";
import { Colors } from "../src/theme";

const COLUMN_COUNT = 3;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

function ViewerImageItemBase({ item }: { item: RecycleBinAsset }) {
  const [loading, setLoading] = useState(true);

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
        source={{ uri: item.uri }}
        style={styles.viewerImage}
        contentFit="contain"
        transition={150}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
      />
    </View>
  );
}

const ViewerImageItem = React.memo(ViewerImageItemBase);
ViewerImageItem.displayName = "ViewerImageItem";

export default function RecycleBinScreen(): React.JSX.Element {
  const router = useRouter();
  const [assets, setAssets] = useState<RecycleBinAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionInFlight, setActionInFlight] = useState<
    "restore" | "delete" | null
  >(null);
  const [viewerIndex, setViewerIndex] = useState<number>(-1);

  const loadAssets = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const items = await listRecycleBinAssetsAsync(120);
      setAssets(items);
      setSelectedIds(new Set());
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Recycle Bin could not be loaded.";
      Alert.alert("Recycle Bin unavailable", message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadAssets();
    }, [loadAssets]),
  );

  const selectedAssets = useMemo(
    () => assets.filter((asset) => selectedIds.has(asset.id)),
    [assets, selectedIds],
  );
  const selectedCount = selectedAssets.length;
  const totalBytes = useMemo(
    () => assets.reduce((sum, asset) => sum + asset.fileSize, 0),
    [assets],
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === assets.length) {
      setSelectedIds(new Set());
      return;
    }

    setSelectedIds(new Set(assets.map((asset) => asset.id)));
  }, [assets, selectedIds.size]);

  const handleRestore = useCallback(async () => {
    if (selectedCount === 0 || actionInFlight) return;

    setActionInFlight("restore");
    try {
      const restored = await restoreRecycleBinAssetsAsync(
        selectedAssets.map((asset) => asset.id),
      );

      if (restored) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await loadAssets();
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not restore selected images.";
      Alert.alert("Restore failed", message);
    } finally {
      setActionInFlight(null);
    }
  }, [actionInFlight, loadAssets, selectedAssets, selectedCount]);

  const handleRestoreItem = useCallback(
    async (asset?: RecycleBinAsset) => {
      if (!asset || actionInFlight) return;

      setActionInFlight("restore");
      try {
        const restored = await restoreRecycleBinAssetsAsync([asset.id]);

        if (restored) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await loadAssets();
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not restore selected images.";
        Alert.alert("Restore failed", message);
      } finally {
        setActionInFlight(null);
      }
    },
    [actionInFlight, loadAssets],
  );

  const performDelete = useCallback(async () => {
    if (selectedCount === 0 || actionInFlight) return;

    setActionInFlight("delete");
    try {
      const deleted = await deleteRecycleBinAssetsAsync(
        selectedAssets.map((asset) => asset.id),
      );

      if (deleted) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await loadAssets();
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not delete selected images.";
      Alert.alert("Delete failed", message);
    } finally {
      setActionInFlight(null);
    }
  }, [actionInFlight, loadAssets, selectedAssets, selectedCount]);

  const handleDelete = useCallback(() => {
    if (selectedCount === 0 || actionInFlight) return;

    Alert.alert(
      "Delete permanently?",
      "These images will be removed forever from your device Trash.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: `Delete ${selectedCount}`,
          style: "destructive",
          onPress: () => void performDelete(),
        },
      ],
    );
  }, [actionInFlight, performDelete, selectedCount]);

  const handleDeleteItem = useCallback(
    (asset?: RecycleBinAsset) => {
      if (!asset || actionInFlight) return;

      Alert.alert(
        "Delete permanently?",
        "This image will be removed forever from your device Trash.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              setActionInFlight("delete");
              try {
                const deleted = await deleteRecycleBinAssetsAsync([asset.id]);

                if (deleted) {
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success,
                  );
                  await loadAssets();
                }
              } catch (error) {
                const message =
                  error instanceof Error
                    ? error.message
                    : "Could not delete this image.";
                Alert.alert("Delete failed", message);
              } finally {
                setActionInFlight(null);
              }
            },
          },
        ],
      );
    },
    [actionInFlight, loadAssets],
  );

  const openViewer = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setViewerIndex(index);
  }, []);

  const closeViewer = useCallback(() => {
    setViewerIndex(-1);
  }, []);

  useEffect(() => {
    if (viewerIndex < 0) return;

    if (assets.length === 0) {
      setViewerIndex(-1);
      return;
    }

    if (viewerIndex >= assets.length) {
      setViewerIndex(assets.length - 1);
    }
  }, [assets.length, viewerIndex]);

  const renderItem = useCallback(
    ({ item, index }: { item: RecycleBinAsset; index: number }) => {
      const isSelected = selectedIds.has(item.id);
      return (
        <Pressable
          onPress={() => openViewer(index)}
          onLongPress={() => toggleSelect(item.id)}
          style={[styles.gridCell, isSelected && styles.gridCellSelected]}
        >
          <Image
            source={{ uri: item.uri }}
            style={styles.gridImage}
            contentFit="cover"
            transition={200}
          />

          <Pressable
            style={styles.selectHotspot}
            onPress={() => toggleSelect(item.id)}
            hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          >
            <View
              style={[
                styles.checkmark,
                !isSelected && styles.checkmarkUnselected,
              ]}
            >
              {isSelected && (
                <MaterialIcons name="check" size={14} color={Colors.bgBase} />
              )}
            </View>
          </Pressable>

          {isSelected && (
            <View style={styles.selectionOverlay} pointerEvents="none" />
          )}
        </Pressable>
      );
    },
    [openViewer, selectedIds, toggleSelect],
  );

  const isBusy = actionInFlight !== null;
  const renderViewerFooter = useCallback(
    (item: RecycleBinAsset) => (
      <View style={styles.viewerBottomBar}>
        <View style={styles.viewerInfo}>
          <Text style={styles.viewerInfoText}>
            {formatMB(item.fileSize)} · {item.width}×{item.height}
          </Text>
          <Text style={styles.viewerMetaText}>
            {new Date(item.creationTime).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.viewerActions}>
          <Pressable
            onPress={() => handleRestoreItem(item)}
            disabled={isBusy}
            style={({ pressed }) => [
              styles.viewerActionBtn,
              pressed && styles.viewerActionBtnPressed,
            ]}
          >
            <MaterialIcons name="restore" size={20} color="#FFF" />
            <Text style={styles.viewerActionText}>Restore</Text>
          </Pressable>

          <Pressable
            onPress={() => handleDeleteItem(item)}
            disabled={isBusy}
            style={({ pressed }) => [
              styles.viewerActionBtn,
              pressed && styles.viewerActionBtnPressed,
            ]}
          >
            <MaterialIcons name="delete-forever" size={20} color="#FFF" />
            <Text style={styles.viewerActionText}>Delete</Text>
          </Pressable>

          <Pressable
            onPress={() => toggleSelect(item.id)}
            style={[
              styles.viewerSelectBtn,
              selectedIds.has(item.id) && styles.viewerSelectBtnActive,
            ]}
          >
            <MaterialIcons
              name={
                selectedIds.has(item.id)
                  ? "check-circle"
                  : "radio-button-unchecked"
              }
              size={22}
              color={
                selectedIds.has(item.id) ? Colors.primaryContainer : "#FFF"
              }
            />
            <Text
              style={[
                styles.viewerSelectText,
                selectedIds.has(item.id) && styles.viewerSelectTextActive,
              ]}
            >
              {selectedIds.has(item.id) ? "Selected" : "Select"}
            </Text>
          </Pressable>
        </View>
      </View>
    ),
    [
      handleDelete,
      handleDeleteItem,
      handleRestore,
      handleRestoreItem,
      isBusy,
      selectedCount,
      selectedIds,
      toggleSelect,
    ],
  );
  const showEmptyState = !loading && assets.length === 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <Header />

      <View style={styles.pageHeader}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
          hitSlop={10}
        >
          <MaterialIcons
            name="chevron-left"
            size={24}
            color={Colors.textPrimary}
          />
        </Pressable>
        <View style={styles.pageHeaderText}>
          <Text style={styles.title}>Recycle Bin</Text>
          <Text style={styles.subtitle}>
            {assets.length} item{assets.length !== 1 ? "s" : ""} ·{" "}
            {formatMB(totalBytes)}
          </Text>
        </View>
        <Pressable
          onPress={handleSelectAll}
          disabled={assets.length === 0}
          style={({ pressed }) => [
            styles.selectAllButton,
            pressed && styles.selectAllButtonPressed,
            assets.length === 0 && styles.selectAllButtonDisabled,
          ]}
        >
          <Text style={styles.selectAllText}>
            {selectedIds.size === assets.length && assets.length > 0
              ? "Deselect"
              : "Select all"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.gridContainer}>
        {loading && (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading trash...</Text>
          </View>
        )}

        {!loading && (
          <FlashList
            data={assets}
            renderItem={renderItem}
            numColumns={COLUMN_COUNT}
            keyExtractor={(item) => item.id}
          />
        )}

        {showEmptyState && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <MaterialIcons
                name="delete-outline"
                size={28}
                color={Colors.textMuted}
              />
            </View>
            <Text style={styles.emptyTitle}>Recycle Bin is empty</Text>
            <Text style={styles.emptySubtitle}>
              Items you move to Trash will show up here for quick restore.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actionBar}>
        <Pressable
          onPress={handleRestore}
          disabled={selectedCount === 0 || isBusy}
          style={({ pressed }) => [
            styles.restoreButton,
            pressed && styles.restoreButtonPressed,
            (selectedCount === 0 || isBusy) && styles.restoreButtonDisabled,
          ]}
        >
          <MaterialIcons name="restore" size={18} color={Colors.onPrimary} />
          <Text style={styles.restoreButtonText}>
            Restore {selectedCount || ""}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleDelete}
          disabled={selectedCount === 0 || isBusy}
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.deleteButtonPressed,
            (selectedCount === 0 || isBusy) && styles.deleteButtonDisabled,
          ]}
        >
          <MaterialIcons name="delete-forever" size={18} color="#FFFFFF" />
          <Text style={styles.deleteButtonText}>
            Delete {selectedCount || ""}
          </Text>
        </Pressable>
      </View>

      {selectedCount > 0 && (
        <View style={styles.selectionPill}>
          <View style={styles.pulseDot} />
          <Text style={styles.selectionPillText}>{selectedCount} selected</Text>
        </View>
      )}

      <MediaViewer
        visible={viewerIndex >= 0}
        items={assets}
        currentIndex={viewerIndex}
        onClose={closeViewer}
        onIndexChange={setViewerIndex}
        renderPage={(item) => <ViewerImageItem item={item} />}
        renderFooter={renderViewerFooter}
        keyExtractor={(item) => `viewer-${item.id}`}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.bgSurface,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  pageHeaderText: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 22,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: Colors.textSecondary,
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  selectAllButtonPressed: {
    backgroundColor: Colors.surfaceContainerLow,
  },
  selectAllButtonDisabled: {
    opacity: 0.5,
  },
  selectAllText: {
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: Colors.textSecondary,
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
    overflow: "hidden",
  },
  gridCellSelected: {
    borderWidth: 1.5,
    borderColor: Colors.primaryContainer,
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  selectionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(13, 118, 110, 0.12)",
  },
  selectHotspot: {
    position: "absolute",
    bottom: 4,
    right: 4,
    padding: 2,
  },
  checkmark: {
    width: 20,
    height: 20,
    backgroundColor: Colors.primaryContainer,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },
  checkmarkUnselected: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  loadingText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textMuted,
  },
  emptyState: {
    position: "absolute",
    top: 120,
    left: 24,
    right: 24,
    alignItems: "center",
    gap: 12,
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },
  emptyTitle: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 16,
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 32,
    backgroundColor: Colors.sheetBg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  restoreButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
  },
  restoreButtonPressed: {
    transform: [{ scale: 0.97 }],
  },
  restoreButtonDisabled: {
    opacity: 0.4,
  },
  restoreButtonText: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: Colors.onPrimary,
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: Colors.danger,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
  },
  deleteButtonPressed: {
    transform: [{ scale: 0.97 }],
  },
  deleteButtonDisabled: {
    opacity: 0.4,
  },
  deleteButtonText: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: "#FFFFFF",
  },
  selectionPill: {
    position: "absolute",
    bottom: 110,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
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
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: Colors.primary,
  },

  viewerPage: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  viewerImage: {
    width: "100%",
    height: "100%",
  },
  viewerBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingHorizontal: 24,
    paddingTop: 32,
    backgroundColor: "rgba(0,0,0,0.7)",
    gap: 16,
  },
  viewerInfo: {
    gap: 4,
  },
  viewerInfoText: {
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    letterSpacing: 1,
  },
  viewerMetaText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
  },
  viewerActions: {
    flexDirection: "row",
    gap: 10,
  },
  viewerActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  viewerActionBtnPressed: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  viewerActionText: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#FFF",
  },
  viewerSelectBtn: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  viewerSelectBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(13, 118, 110, 0.15)",
  },
  viewerSelectText: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "#FFF",
  },
  viewerSelectTextActive: {
    color: Colors.primary,
  },
});
