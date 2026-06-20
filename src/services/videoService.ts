import AsyncStorage from "@react-native-async-storage/async-storage";
import * as MediaLibrary from "expo-media-library";
import type { RecordingMetadata } from "../types/recording";

const RECORDED_VIDEOS_STORAGE_KEY = "recordedVideos";

export type SavedVideoRecord = RecordingMetadata & {
  id: string;
};

export async function saveRecordedVideo(uri: string): Promise<string> {
  const permission = await MediaLibrary.requestPermissionsAsync(true, ["video"]);

  if (!permission.granted) {
    throw new Error("Media library permission is required to save recorded videos.");
  }

  const asset = await MediaLibrary.createAssetAsync(uri);
  return asset.uri;
}

export async function saveRecordingMetadata(metadata: RecordingMetadata): Promise<SavedVideoRecord> {
  const record: SavedVideoRecord = {
    ...metadata,
    id: `${metadata.recordedAt}-${metadata.savedUri}`,
  };

  const existingRecords = await getSavedVideoRecords();
  const nextRecords = [record, ...existingRecords];
  await AsyncStorage.setItem(RECORDED_VIDEOS_STORAGE_KEY, JSON.stringify(nextRecords));

  return record;
}

export async function getSavedVideoRecords(): Promise<SavedVideoRecord[]> {
  const rawRecords = await AsyncStorage.getItem(RECORDED_VIDEOS_STORAGE_KEY);

  if (!rawRecords) {
    return [];
  }

  try {
    const records = JSON.parse(rawRecords);
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}
