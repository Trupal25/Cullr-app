import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Header } from '../../src/components/header';
import { BottomNav } from '../../src/components/bottom-nav';
import { StatusBarPill } from '../../src/components/status-bar-pill';
import { Colors } from '../../src/theme';

export default function EmptyStateScreen(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <Header />

      <View style={styles.content}>
        <View style={styles.centerContent}>
          {/* Atmospheric Graphic */}
          <View style={styles.graphicContainer}>
            <View style={styles.glowCircle} />
            <Text style={styles.zeroText}>0</Text>
            <View style={styles.underline} />
          </View>

          {/* Typography Cluster */}
          <View style={styles.textCluster}>
            <Text style={styles.headline}>Nothing to cull.</Text>
            <Text style={styles.subtitle}>
              Your gallery looks clean. No spam or junk detected.
            </Text>
          </View>

          {/* Scan Again Button */}
          <Pressable
            style={({ pressed }) => [
              styles.scanButton,
              pressed && styles.scanButtonPressed,
            ]}
          >
            <MaterialIcons name="refresh" size={18} color={Colors.textSecondary} />
            <Text style={styles.scanButtonText}>Scan Again</Text>
          </Pressable>
        </View>
      </View>

      {/* Status Pill */}
      <View style={styles.statusPillContainer}>
        <StatusBarPill />
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
    paddingHorizontal: 32,
  },
  centerContent: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    gap: 40,
  },

  // Graphic
  graphicContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(62, 207, 191, 0.05)',
  },
  zeroText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 160,
    lineHeight: 160,
    color: Colors.primaryContainer,
    letterSpacing: -4,
    opacity: 0.8,
  },
  underline: {
    width: 48,
    height: 2,
    backgroundColor: Colors.outlineVariant,
    opacity: 0.3,
    marginTop: -8,
  },

  // Text Cluster
  textCluster: {
    alignItems: 'center',
    gap: 12,
  },
  headline: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 28,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 17,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },

  // Scan Button
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(60, 73, 71, 0.3)',
    marginTop: 16,
  },
  scanButtonPressed: {
    borderColor: 'rgba(62, 207, 191, 0.5)',
    backgroundColor: 'rgba(62, 207, 191, 0.03)',
  },
  scanButtonText: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
  },

  // Status Pill
  statusPillContainer: {
    marginBottom: 12,
  },
});
