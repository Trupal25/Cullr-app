import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Header } from '../../src/components/header';
import { BottomNav } from '../../src/components/bottom-nav';
import { useScanStore } from '../../src/store/scan-store';
import { useMediaPermission } from '../../src/hooks/use-permissions';
import { runScan } from '../../src/services/scan-orchestrator';
import { Colors } from '../../src/theme';
import type { ScanRange, ScanType, ScanConfig } from '../../src/types';

// ── Config data ──────────────────────────────────────────────────────────────

type RangeOption = {
  value: ScanRange;
  label: string;
  desc: string;
  icon: keyof typeof MaterialIcons.glyphMap;
};

const RANGE_OPTIONS: RangeOption[] = [
  { value: 100,   label: 'Last 100',   desc: 'Quick scan',      icon: 'bolt' },
  { value: 500,   label: 'Last 500',   desc: 'Recent photos',   icon: 'photo-library' },
  { value: 1000,  label: 'Last 1,000', desc: 'Deep scan',       icon: 'collections' },
  { value: 'all', label: 'All Photos', desc: 'Full gallery',    icon: 'all-inclusive' },
];

type ScanTypeOption = {
  value: ScanType;
  label: string;
  desc: string;
  icon: keyof typeof MaterialIcons.glyphMap;
};

const SCAN_TYPE_OPTIONS: ScanTypeOption[] = [
  {
    value: 'metadata',
    label: 'Smart Spam Scan',
    desc: 'Analyzes resolution, file size & messaging patterns to find forwarded junk',
    icon: 'auto-awesome',
  },
  {
    value: 'source',
    label: 'App Bulk Review',
    desc: 'Shows ALL images from WhatsApp, Telegram & Instagram for quick triage',
    icon: 'apps',
  },
];

type ConfigStep = 'idle' | 'range' | 'type' | 'scanning';

// ── Component ────────────────────────────────────────────────────────────────

export default function ScanHomeScreen(): React.JSX.Element {
  const router = useRouter();
  const {
    state,
    setScanStatus,
    setScanProgress,
    setResults,
    setScanType,
    updateStats,
  } = useScanStore();
  const { requestPermission, status: permissionStatus } = useMediaPermission();
  const stats = state.stats;

  const [configStep, setConfigStep] = useState<ConfigStep>('idle');
  const [selectedRange, setSelectedRange] = useState<ScanRange>(500);
  const [selectedType, setSelectedType] = useState<ScanType>('metadata');

  const pulseScale = useSharedValue(1);

  useEffect(() => {
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

  const handleStartConfig = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConfigStep('range');
  }, []);

  const handleRangeSelect = useCallback((range: ScanRange) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRange(range);
    setConfigStep('type');
  }, []);

  const handleTypeSelect = useCallback((type: ScanType) => {
    Haptics.selectionAsync();
    setSelectedType(type);
  }, []);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (configStep === 'type') {
      setConfigStep('range');
    } else {
      setConfigStep('idle');
    }
  }, [configStep]);

  const handleStartScan = useCallback(async (): Promise<void> => {
    // Gate on permission
    if (permissionStatus !== 'granted') {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Cullr needs access to your photo library to scan for spam images.'
        );
        return;
      }
    }

    const config: ScanConfig = {
      range: selectedRange,
      type: selectedType,
    };

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScanType(selectedType);
    setConfigStep('scanning');
    setScanStatus('scanning');

    try {
      const { results, totalScanned } = await runScan((label, progress) => {
        setScanProgress(progress, label);
      }, config);

      setResults(results);
      
      // Update cumulative all-time stats
      updateStats({
        lastScanDate: new Date().toISOString(),
        totalScanned: stats.totalScanned + totalScanned,
        totalFlagged: stats.totalFlagged + results.length,
      });

      setConfigStep('idle');

      if (results.length > 0) {
        router.push('/(tabs)/results');
      } else {
        router.push('/(tabs)/empty');
      }
    } catch {
      setScanStatus('idle');
      setConfigStep('idle');
      Alert.alert('Scan Error', 'Something went wrong while scanning your gallery.');
    }
  }, [
    permissionStatus,
    requestPermission,
    router,
    selectedRange,
    selectedType,
    setResults,
    setScanProgress,
    setScanStatus,
    setScanType,
    stats.totalFlagged,
    stats.totalScanned,
    updateStats,
  ]);

  const lastScan = stats.lastScanDate
    ? formatRelativeDate(stats.lastScanDate)
    : null;
  const deletedCount = stats.totalDeleted;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <Header />
      <View style={styles.content}>
        {/* Idle state — big scan button */}
        {configStep === 'idle' && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.centerContainer}>
            <View style={styles.labelSection}>
              <Text style={styles.intelligenceLabel}>Gallery Intelligence</Text>
              <View style={styles.labelDivider} />
            </View>

            <View style={styles.scannerSection}>
              <Pressable
                onPress={handleStartConfig}
                style={({ pressed }) => [
                  styles.scanButton,
                  pressed && styles.scanButtonPressed,
                ]}
              >
                <Animated.View style={[styles.pulseRing, pulseStyle]} />
                <MaterialIcons name="photo-camera" size={36} color={Colors.primary} />
              </Pressable>

              <View style={styles.scanTextContainer}>
                <Text style={styles.scanTitle}>Scan Gallery</Text>
                <Text style={styles.scanSubtitle}>
                  Choose what to scan{' '}
                  <Text style={styles.scanDot}>·</Text>
                  {' '}Never uploads your photos
                </Text>
              </View>
            </View>

            {/* Activity Feed Chip */}
            <Pressable 
              style={({ pressed }) => [styles.activityChip, pressed && { opacity: 0.7 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(tabs)/stats');
              }}
            >
              <MaterialIcons name="history" size={18} color={Colors.textMuted} />
              <Text style={styles.activityText}>
                {lastScan
                  ? `Last scan: ${lastScan}${deletedCount > 0 ? ` • ${deletedCount} images deleted` : ''}`
                  : 'No scans yet'}
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Step 1: Choose range */}
        {configStep === 'range' && (
          <Animated.View entering={SlideInDown.duration(350).springify()} style={styles.configContainer}>
            <Pressable onPress={handleBack} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={20} color={Colors.textSecondary} />
            </Pressable>

            <View style={styles.stepHeader}>
              <Text style={styles.stepLabel}>Step 1 of 2</Text>
              <Text style={styles.stepTitle}>How many photos?</Text>
              <Text style={styles.stepDesc}>Choose how far back to scan in your gallery</Text>
            </View>

            <View style={styles.optionsGrid}>
              {RANGE_OPTIONS.map((opt) => (
                <Pressable
                  key={String(opt.value)}
                  onPress={() => handleRangeSelect(opt.value)}
                  style={({ pressed }) => [
                    styles.optionCard,
                    selectedRange === opt.value && styles.optionCardSelected,
                    pressed && styles.optionCardPressed,
                  ]}
                >
                  <View style={[styles.optionIconContainer, selectedRange === opt.value && styles.optionIconSelected]}>
                    <MaterialIcons
                      name={opt.icon}
                      size={22}
                      color={selectedRange === opt.value ? Colors.onPrimary : Colors.textMuted}
                    />
                  </View>
                  <Text style={[styles.optionLabel, selectedRange === opt.value && styles.optionLabelSelected]}>{opt.label}</Text>
                  <Text style={styles.optionDesc}>{opt.desc}</Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Step 2: Choose scan type */}
        {configStep === 'type' && (
          <Animated.View entering={SlideInDown.duration(350).springify()} style={styles.configContainer}>
            <Pressable onPress={handleBack} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={20} color={Colors.textSecondary} />
            </Pressable>

            <View style={styles.stepHeader}>
              <Text style={styles.stepLabel}>Step 2 of 2</Text>
              <Text style={styles.stepTitle}>Scan mode</Text>
              <Text style={styles.stepDesc}>Choose a detection method</Text>
            </View>

            <View style={styles.typeList}>
              {SCAN_TYPE_OPTIONS.map((opt) => {
                const isSelected = selectedType === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => handleTypeSelect(opt.value)}
                    style={({ pressed }) => [
                      styles.typeCard,
                      isSelected && styles.typeCardSelected,
                      pressed && styles.typeCardPressed,
                    ]}
                  >
                    <View style={[styles.typeIconContainer, isSelected && styles.typeIconSelected]}>
                      <MaterialIcons
                        name={opt.icon}
                        size={22}
                        color={isSelected ? Colors.onPrimary : Colors.textMuted}
                      />
                    </View>
                    <View style={styles.typeTextContainer}>
                      <Text style={[styles.typeLabel, isSelected && styles.typeLabelSelected]}>{opt.label}</Text>
                      <Text style={styles.typeDesc}>{opt.desc}</Text>
                    </View>
                    <View style={[styles.radio, isSelected && styles.radioSelected]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Summary & Start */}
            <View style={styles.summaryBar}>
              <Text style={styles.summaryText}>
                {selectedRange === 'all' ? 'All photos' : `Last ${selectedRange}`} · {SCAN_TYPE_OPTIONS.find(o => o.value === selectedType)?.label}
              </Text>
            </View>

            <Pressable
              onPress={handleStartScan}
              style={({ pressed }) => [
                styles.startScanButton,
                pressed && styles.startScanButtonPressed,
              ]}
            >
              <MaterialIcons name="radar" size={20} color={Colors.onPrimary} />
              <Text style={styles.startScanText}>Start Scan</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Scanning state */}
        {configStep === 'scanning' && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.centerContainer}>
            <View style={styles.scannerSection}>
              <View style={[styles.scanButton, styles.scanButtonScanning]}>
                <Animated.View style={[styles.pulseRing, pulseStyle]} />
                <View style={styles.progressContainer}>
                  <Text style={styles.progressText}>{state.scanProgress}%</Text>
                </View>
              </View>

              <View style={styles.scanTextContainer}>
                <Text style={styles.scanTitle}>Scanning...</Text>
                <Text style={styles.scanSubtitle}>{state.scanPhaseLabel}</Text>
              </View>
            </View>
          </Animated.View>
        )}
      </View>
      <BottomNav activeTab="home" />
    </SafeAreaView>
  );
}

function formatRelativeDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 2) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bgBase,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Idle state ──
  labelSection: {
    alignItems: 'center',
    marginBottom: 60,
  },
  intelligenceLabel: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
    marginBottom: 5,
  },
  labelDivider: {
    width: 32,
    height: 1,
    backgroundColor: Colors.surfaceContainerHighest,
  },
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
    borderColor: 'rgba(13, 118, 110, 0.2)',
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
  scanButtonScanning: {
    borderColor: Colors.primary,
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: 'rgba(13, 118, 110, 0.1)',
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 28,
    color: Colors.primary,
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
    maxWidth: 280,
  },
  scanDot: {
    opacity: 0.4,
  },
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

  // ── Config steps ──
  configContainer: {
    flex: 1,
    paddingTop: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  stepHeader: {
    marginBottom: 32,
  },
  stepLabel: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: Colors.primary,
    marginBottom: 8,
  },
  stepTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  stepDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // ── Range grid ──
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionCard: {
    width: '47%',
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 10,
  },
  optionCardSelected: {
    borderColor: 'rgba(13, 118, 110, 0.3)',
    backgroundColor: 'rgba(13, 118, 110, 0.05)',
  },
  optionCardPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.8,
  },
  optionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconSelected: {
    backgroundColor: Colors.primaryContainer,
  },
  optionLabel: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 14,
    color: Colors.textPrimary,
  },
  optionLabelSelected: {
    color: Colors.primary,
  },
  optionDesc: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.textDark,
  },

  // ── Scan type list ──
  typeList: {
    gap: 12,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 14,
  },
  typeCardSelected: {
    borderColor: 'rgba(13, 118, 110, 0.3)',
    backgroundColor: 'rgba(13, 118, 110, 0.05)',
  },
  typeCardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.85,
  },
  typeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconSelected: {
    backgroundColor: Colors.primaryContainer,
  },
  typeTextContainer: {
    flex: 1,
  },
  typeLabel: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  typeLabelSelected: {
    color: Colors.primary,
  },
  typeDesc: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 11,
    color: Colors.textDark,
    lineHeight: 16,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.surfaceContainerHighest,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  radioSelected: {
    borderColor: Colors.primaryContainer,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primaryContainer,
  },

  // ── Summary + CTA ──
  summaryBar: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 8,
    alignItems: 'center',
  },
  summaryText: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  startScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
    paddingVertical: 16,
    backgroundColor: Colors.primary,
    borderRadius: 14,
  },
  startScanButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  startScanText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.onPrimary,
  },
});
