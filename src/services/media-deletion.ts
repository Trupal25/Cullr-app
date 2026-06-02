import * as MediaLibrary from "expo-media-library";
import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

type CullrSystemTrashModule = {
  moveToTrashAsync: (assetIds: string[]) => Promise<boolean>;
  listTrashedImagesAsync: (limit: number) => Promise<RecycleBinAsset[]>;
  restoreFromTrashAsync: (assetIds: string[]) => Promise<boolean>;
  deletePermanentlyAsync: (assetIds: string[]) => Promise<boolean>;
};

export type RemovalDestination =
  | "android-trash"
  | "ios-recently-deleted"
  | "permanent";

export type RecycleBinAsset = {
  id: string;
  filename: string;
  uri: string;
  width: number;
  height: number;
  fileSize: number;
  creationTime: number;
};

export function getRemovalDestination(): RemovalDestination {
  if (Platform.OS === "ios") {
    return "ios-recently-deleted";
  }

  if (Platform.OS === "android" && Number(Platform.Version) >= 30) {
    return "android-trash";
  }

  return "permanent";
}

export function getRemovalConfirmationText(): string {
  switch (getRemovalDestination()) {
    case "android-trash":
      return "Android will ask you to move them to your device Trash.";
    case "ios-recently-deleted":
      return "Photos moves them to Recently Deleted, where they can be recovered.";
    case "permanent":
      return "After Undo expires, deletion is permanent and cannot be recovered.";
  }
}

export function usesUndoWindow(): boolean {
  return getRemovalDestination() === "permanent";
}

export function isRecycleBinAvailable(): boolean {
  return Platform.OS === "android" && Number(Platform.Version) >= 30;
}

function getSystemTrashModule(): CullrSystemTrashModule {
  const systemTrash =
    requireOptionalNativeModule<CullrSystemTrashModule>("CullrSystemTrash");

  const hasRequiredMethods =
    !!systemTrash &&
    typeof systemTrash.moveToTrashAsync === "function" &&
    typeof systemTrash.listTrashedImagesAsync === "function" &&
    typeof systemTrash.restoreFromTrashAsync === "function" &&
    typeof systemTrash.deletePermanentlyAsync === "function";

  if (!hasRequiredMethods) {
    throw new Error(
      "System Trash is unavailable until the Android app is rebuilt.",
    );
  }

  const requiredMethods: (keyof CullrSystemTrashModule)[] = [
    "moveToTrashAsync",
    "listTrashedImagesAsync",
    "restoreFromTrashAsync",
    "deletePermanentlyAsync",
  ];

  for (const method of requiredMethods) {
    if (typeof systemTrash[method] !== "function") {
      throw new Error(
        `System Trash is missing ${method}. Rebuild the Android app to load the latest native module.`,
      );
    }
  }

  return systemTrash;
}

export async function removeAssetsAsync(assetIds: string[]): Promise<boolean> {
  if (getRemovalDestination() === "android-trash") {
    return getSystemTrashModule().moveToTrashAsync(assetIds);
  }

  return MediaLibrary.deleteAssetsAsync(assetIds);
}

export async function listRecycleBinAssetsAsync(
  limit = 60,
): Promise<RecycleBinAsset[]> {
  if (!isRecycleBinAvailable()) {
    return [];
  }

  return getSystemTrashModule().listTrashedImagesAsync(limit);
}

export async function deleteRecycleBinAssetsAsync(
  assetIds: string[],
): Promise<boolean> {
  if (assetIds.length === 0) {
    return true;
  }

  if (!isRecycleBinAvailable()) {
    throw new Error("Recycle Bin is only available on Android 11 or later.");
  }

  return getSystemTrashModule().deletePermanentlyAsync(assetIds);
}

export async function restoreRecycleBinAssetsAsync(
  assetIds: string[],
): Promise<boolean> {
  if (assetIds.length === 0) {
    return true;
  }

  if (!isRecycleBinAvailable()) {
    throw new Error("Recycle Bin is only available on Android 11 or later.");
  }

  return getSystemTrashModule().restoreFromTrashAsync(assetIds);
}
