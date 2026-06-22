import type { VideoQuality } from "expo-camera";

export const MIN_RECORDING_DURATION_SECONDS = 1;
export const MAX_RECORDING_DURATION_SECONDS = 600;

function getMaxDurationSeconds(): number {
  const configured = Number(process.env.EXPO_PUBLIC_MAX_RECORDING_DURATION_SECONDS ?? 60);
  return Number.isInteger(configured) &&
    configured >= MIN_RECORDING_DURATION_SECONDS &&
    configured <= MAX_RECORDING_DURATION_SECONDS
    ? configured
    : 60;
}

export const CAMERA_CONFIG = {
  FPS: 30,
  MAX_DURATION: getMaxDurationSeconds(),
  RESOLUTION: "1920x1080",
  VIDEO_QUALITY: "1080p" as VideoQuality,
};
