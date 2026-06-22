import { Directory, File, Paths } from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { markLocalFileDeleted, type VideoListItem } from "../db/videoRepository";

export type PersistedVideo = {
  localPath: string;
  fileSizeBytes: number;
  galleryUri: string | null;
};

export async function saveRecordedVideo(sourceUri: string, videoId: string): Promise<PersistedVideo> {
  const recordingsDirectory = new Directory(Paths.document, "recordings");
  recordingsDirectory.create({ idempotent: true, intermediates: true });

  const sourceFile = new File(sourceUri);
  const localFile = new File(recordingsDirectory, `${videoId}.mp4`);
  sourceFile.copy(localFile);

  let galleryUri: string | null = null;

  try {
    const permission = await MediaLibrary.requestPermissionsAsync(true, ["video"]);
    if (permission.granted) {
      const asset = await MediaLibrary.createAssetAsync(localFile.uri);
      galleryUri = asset.uri;
    }
  } catch (error) {
    console.warn("Video was stored locally but could not be copied to the gallery:", error);
  }

  return {
    localPath: localFile.uri,
    fileSizeBytes: localFile.size,
    galleryUri,
  };
}

export async function deleteLocalRecording(video: VideoListItem): Promise<void> {
  if (video.uploadState !== "uploaded" && video.uploadState !== "failed") {
    throw new Error("Wait for the upload to finish before deleting the local file.");
  }

  if (video.localDeletedAt) {
    return;
  }

  const file = new File(video.localPath);
  if (file.exists) {
    file.delete();
  }

  const updated = await markLocalFileDeleted(video.videoId);
  if (!updated) {
    throw new Error("The local file could not be marked as deleted.");
  }
}
