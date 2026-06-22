export type GpsStatus = "idle" | "checking" | "ready" | "denied" | "error";
export type RecordingStatus = "idle" | "preparing" | "recording" | "saving";
export type UploadNetworkType = "wifi" | "cellular" | "none" | "unknown";
export type UploadState = "pending" | "uploading" | "uploaded" | "failed";
export type FpsTier = "low" | "standard" | "high";

export type GpsCoordinates = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  capturedAt: string;
};

export type RecordingMetadataJson = {
  video_id: string;
  worker_id: string;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  file_size_bytes: number;
  fps: number;
  fps_tier: FpsTier;
  device_model: string;
  os_version: string;
  resolution: string;
  local_path: string;
  gps_at_start: {
    lat: number;
    lng: number;
    accuracy: number | null;
    captured_at: string;
  };
  battery_level_at_start: number | null;
  battery_level_at_end: number | null;
  network_type_at_upload: UploadNetworkType | null;
  camera_facing_at_start: "front" | "back";
  video_metadata_source: "mp4_track" | "configured_fallback";
  gallery_uri: string | null;
};

export type RecordingMetadata = {
  videoId: string;
  workerId: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  fileSizeBytes: number;
  fps: number;
  fpsTier: FpsTier;
  deviceModel: string;
  osVersion: string;
  resolution: string;
  localPath: string;
  metadata: RecordingMetadataJson;
  uploadState: UploadState;
  attemptCount: number;
  lastError: string | null;
  lastAttemptedAt: string | null;
};
