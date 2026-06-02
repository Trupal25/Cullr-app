import { MaterialIcons } from "@expo/vector-icons";
import React, { useCallback, useRef } from "react";
import {
    Dimensions,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type MediaViewerProps<T> = {
  visible: boolean;
  items: T[];
  currentIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  renderPage: (item: T) => React.ReactElement;
  renderFooter?: (item: T) => React.ReactElement | null;
  keyExtractor: (item: T, index: number) => string;
  showSwipeHint?: boolean;
};

export function MediaViewer<T>({
  visible,
  items,
  currentIndex,
  onClose,
  onIndexChange,
  renderPage,
  renderFooter,
  keyExtractor,
  showSwipeHint = true,
}: MediaViewerProps<T>): React.JSX.Element {
  const listRef = useRef<FlatList<T>>(null);

  const onScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      onIndexChange(newIndex);
    },
    [onIndexChange],
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<T> | null | undefined, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    [],
  );

  const activeItem = items[currentIndex];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {visible && (
        <View style={styles.viewerContainer}>
          <FlatList
            ref={listRef}
            data={items}
            renderItem={({ item }) => renderPage(item)}
            keyExtractor={keyExtractor}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={currentIndex}
            getItemLayout={getItemLayout}
            onMomentumScrollEnd={onScrollEnd}
            bounces={false}
            windowSize={3}
            maxToRenderPerBatch={1}
          />

          <View style={styles.viewerTopbar}>
            <View style={styles.viewerCounter}>
              <Text style={styles.viewerCounterText}>
                {currentIndex + 1} / {items.length}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.viewerCloseBtn}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <MaterialIcons name="close" size={28} color="#FFF" />
            </Pressable>
          </View>

          {showSwipeHint && items.length > 1 && (
            <View style={styles.swipeHint} pointerEvents="none">
              <MaterialIcons
                name="swipe"
                size={16}
                color="rgba(255,255,255,0.4)"
              />
              <Text style={styles.swipeHintText}>Swipe</Text>
            </View>
          )}

          {activeItem && renderFooter?.(activeItem)}
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  viewerContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.97)",
  },
  viewerTopbar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  viewerCounter: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  viewerCounterText: {
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    letterSpacing: 1,
  },
  viewerCloseBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 22,
  },
  swipeHint: {
    position: "absolute",
    top: "50%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 9999,
    marginTop: 120,
    opacity: 0.6,
  },
  swipeHintText: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.4)",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
