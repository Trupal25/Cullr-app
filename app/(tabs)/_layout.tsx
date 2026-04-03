import { Redirect, Tabs } from "expo-router";
import React from "react";
import { UndoSnackbar } from "../../src/components/undo-snackbar";
import { useScanStore } from "../../src/store/scan-store";
import { Colors } from "../../src/theme";

export default function TabLayout(): React.JSX.Element {
  const { state } = useScanStore();

  // Guard: if hydrated but not onboarded, send back to onboarding
  if (state.isHydrated && !state.isOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: "none" },
          sceneStyle: { backgroundColor: Colors.bgBase },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Home", href: null }} />
        <Tabs.Screen
          name="results"
          options={{ title: "Results", href: null }}
        />
        <Tabs.Screen name="empty" options={{ title: "Empty", href: null }} />
        <Tabs.Screen name="stats" options={{ title: "Stats", href: null }} />
        <Tabs.Screen
          name="settings"
          options={{ title: "Settings", href: null }}
        />
      </Tabs>
      <UndoSnackbar />
    </>
  );
}
