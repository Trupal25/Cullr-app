import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme';

type StatusBarPillProps = {
  status?: string;
  version?: string;
};

export function StatusBarPill({
  status = 'Idle',
  version = 'v2.0.4',
}: StatusBarPillProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <View style={styles.statusGroup}>
        <View style={styles.dot} />
        <Text style={styles.text}>{status.toUpperCase()}</Text>
      </View>
      <View style={styles.divider} />
      <Text style={styles.text}>{version.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
    borderRadius: 9999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15, 23, 42, 0.1)',
    gap: 12,
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.15)',
  },
  text: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 9,
    letterSpacing: 2,
    color: Colors.onSecondaryContainer,
  },
});
