import { File } from "expo-file-system";
import { createFile, MP4BoxBuffer, type Movie } from "mp4box";
import { CAMERA_CONFIG } from "../constants/camera";

export type VideoMetadataSource = "mp4_track" | "configured_fallback";

export type VideoTechnicalMetadata = {
  fps: number;
  resolution: string;
  source: VideoMetadataSource;
};

const PARSER_CHUNK_SIZE_BYTES = 256 * 1024;
const MAX_METADATA_BYTES = 8 * 1024 * 1024;

function metadataFromMovie(movie: Movie): VideoTechnicalMetadata | null {
  const track = movie.videoTracks[0];
  if (!track) {
    return null;
  }

  const durationSeconds = track.timescale > 0 ? track.samples_duration / track.timescale : 0;
  const fps = durationSeconds > 0 ? track.nb_samples / durationSeconds : 0;
  const width = track.video?.width ?? track.track_width;
  const height = track.video?.height ?? track.track_height;

  if (!Number.isFinite(fps) || fps <= 0 || width <= 0 || height <= 0) {
    return null;
  }

  return {
    fps: Math.round(fps * 100) / 100,
    resolution: `${Math.round(width)}x${Math.round(height)}`,
    source: "mp4_track",
  };
}

export async function readVideoTechnicalMetadata(localPath: string): Promise<VideoTechnicalMetadata> {
  const fallback: VideoTechnicalMetadata = {
    fps: CAMERA_CONFIG.FPS,
    resolution: CAMERA_CONFIG.RESOLUTION,
    source: "configured_fallback",
  };

  let handle: ReturnType<File["open"]> | null = null;

  try {
    const source = new File(localPath);
    handle = source.open();
    const parser = createFile();
    let movie: Movie | null = null;
    let parseError: Error | null = null;
    let offset = 0;
    let parsedBytes = 0;

    parser.onReady = (info) => {
      movie = info;
    };
    parser.onError = (module, message) => {
      parseError = new Error(`${module}: ${message}`);
    };

    while (!movie && !parseError && offset < source.size && parsedBytes < MAX_METADATA_BYTES) {
      handle.offset = offset;
      const bytes = handle.readBytes(Math.min(PARSER_CHUNK_SIZE_BYTES, source.size - offset));
      if (bytes.byteLength === 0) {
        break;
      }

      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      const nextOffset = parser.appendBuffer(MP4BoxBuffer.fromArrayBuffer(buffer, offset));
      parsedBytes += bytes.byteLength;
      offset = Number.isFinite(nextOffset) && nextOffset > offset ? nextOffset : offset + bytes.byteLength;
    }

    parser.flush();
    if (parseError) {
      throw parseError;
    }

    return movie ? metadataFromMovie(movie) ?? fallback : fallback;
  } catch (error) {
    console.warn("Could not read MP4 track metadata; using the configured camera profile:", error);
    return fallback;
  } finally {
    handle?.close();
  }
}
