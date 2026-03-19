import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Header } from '../../src/components/header';
import { BottomNav } from '../../src/components/bottom-nav';
import { Colors } from '../../src/theme';

export default function ScanHomeScreen(): React.JSX.Element {
  const router = useRouter();
  const pulseScale = useSharedValue(1);

  React.useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(1.15, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: 2 - pulseScale.value,
  }));

  const handleScan = (): void => {
    router.push('/(tabs)/results');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <Header />
      <View style={styles.content}>
        {/* Gallery Intelligence Label */}
        <View style={styles.labelSection}>
          <Text style={styles.intelligenceLabel}>Gallery Intelligence</Text>
          <View style={styles.labelDivider} />
        </View>

        {/* Central Scanner UI */}
        <View style={styles.scannerSection}>
          <Pressable
            onPress={handleScan}
            style={({ pressed }) => [
              styles.scanButton,
              pressed && styles.scanButtonPressed,
            ]}
          >
            <Animated.View style={[styles.pulseRing, pulseStyle]} />
            <MaterialIcons name="photo-camera" size={36} color={Colors.primaryContainer} />
          </Pressable>

          <View style={styles.scanTextContainer}>
            <Text style={styles.scanTitle}>Scan Gallery</Text>
            <Text style={styles.scanSubtitle}>
              Analyzes metadata{' '}
              <Text style={styles.scanDot}>·</Text>
              {' '}Never uploads your photos
            </Text>
          </View>
        </View>

        {/* Activity Feed Chip */}
        <View style={styles.activityChip}>
          <MaterialIcons name="history" size={18} color={Colors.textMuted} />
          <Text style={styles.activityText}>
            Last scan: 3 days ago{' '}
            <Text style={styles.activityDot}>•</Text>
            {' '}14 images deleted
          </Text>
        </View>
      </View>
      <BottomNav activeTab="home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bgBase,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  // Label Section
  labelSection: {
    alignItems: 'center',
    marginBottom: 60,
  },
  intelligenceLabel: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  labelDivider: {
    width: 32,
    height: 1,
    backgroundColor: Colors.surfaceContainerHighest,
  },

  // Scanner Section
  scannerSection: {
    alignItems: 'center',
    gap: 36,
  },
  scanButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: 'rgba(62, 207, 191, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3ECFBF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 40,
    elevation: 4,
  },
  scanButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: 'rgba(62, 207, 191, 0.1)',
  },
  scanTextContainer: {
    alignItems: 'center',
  },
  scanTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  scanSubtitle: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: Colors.textDark,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 240,
  },
  scanDot: {
    opacity: 0.4,
  },

  // Activity Chip
  activityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    marginTop: 72,
  },
  activityText: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  activityDot: {
    color: Colors.textDark,
  },
});
