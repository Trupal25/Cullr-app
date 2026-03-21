import { useState, useEffect, useCallback } from 'react';
import * as MediaLibrary from 'expo-media-library';

type PermissionState = {
  status: 'undetermined' | 'granted' | 'denied' | 'limited';
  isLoading: boolean;
};

export function useMediaPermission(): PermissionState & { requestPermission: () => Promise<boolean> } {
  const [state, setState] = useState<PermissionState>({
    status: 'undetermined',
    isLoading: true,
  });

  useEffect(() => {
    async function check(): Promise<void> {
      try {
        const { status } = await MediaLibrary.getPermissionsAsync(
          false,
          ['photo']
        );
        setState({ status: mapStatus(status), isLoading: false });
      } catch (error) {
        console.warn('Expo Go Permission Check Error:', error);
        // Fallback to try proceeding without crashing, or wait for dev client
        setState({ status: 'undetermined', isLoading: false });
      }
    }
    check();
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(
        false,
        ['photo']
      );
      const mapped = mapStatus(status);
      setState({ status: mapped, isLoading: false });
      return mapped === 'granted' || mapped === 'limited';
    } catch (error) {
      console.warn('Expo Go Permission Request Error:', error);
      setState({ status: 'undetermined', isLoading: false });
      return false;
    }
  }, []);

  return { ...state, requestPermission };
}

function mapStatus(
  status: MediaLibrary.PermissionStatus
): PermissionState['status'] {
  switch (status) {
    case MediaLibrary.PermissionStatus.GRANTED:
      return 'granted';
    case MediaLibrary.PermissionStatus.DENIED:
      return 'denied';
    default:
      return 'undetermined';
  }
}
