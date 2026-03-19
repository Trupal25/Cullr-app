import React from 'react';
import { Tabs } from 'expo-router';
import { Colors } from '../../src/theme';

export default function TabLayout(): React.JSX.Element {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
        sceneStyle: { backgroundColor: Colors.surface },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="results" options={{ title: 'Results' }} />
      <Tabs.Screen name="empty" options={{ title: 'Empty' }} />
    </Tabs>
  );
}
