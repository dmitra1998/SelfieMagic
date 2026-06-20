export type GpsStatus = "idle" | "checking" | "ready" | "denied" | "error";
export type RecordingStatus = "idle" | "preparing" | "recording" | "saving";
export type UploadNetworkType = "wifi" | "cellular" | "none" | "unknown";

export type GpsCoordinates = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  capturedAt: string;
};

export type RecordingMetadata = {
  gpsAtStart: GpsCoordinates;
  batteryLevelAtStart: number;
  batteryLevelAtEnd: number;
  savedUri: string;
  recordedAt: string;
};
