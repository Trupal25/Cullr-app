import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { useScanStore } from '../../src/store/scan-store';
import { Colors } from '../../src/theme';

export default function TabLayout(): React.JSX.Element {
  const { state } = useScanStore();

  // Guard: if hydrated but not onboarded, send back to onboarding
  if (state.isHydrated && !state.isOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
        sceneStyle: { backgroundColor: Colors.bgBase },
      }}
    >
      <Tabs.Screen name="index"   options={{ title: 'Home' }} />
      <Tabs.Screen name="results" options={{ title: 'Results' }} />
      <Tabs.Screen name="empty"   options={{ title: 'Empty' }} />
    </Tabs>
  );
}
