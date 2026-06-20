import { Directory, File, Paths } from "expo-file-system";
import * as MediaLibrary from "expo-media-library";

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
