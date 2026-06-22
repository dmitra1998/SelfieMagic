import type { VideoQuality } from "expo-camera";

function getMaxDurationSeconds(): number {
  const configured = Number(process.env.EXPO_PUBLIC_MAX_RECORDING_DURATION_SECONDS ?? 60);
  return Number.isInteger(configured) && configured > 0 && configured <= 600 ? configured : 60;
}

export const CAMERA_CONFIG = {
  FPS: 30,
  MAX_DURATION: getMaxDurationSeconds(),
  RESOLUTION: "1920x1080",
  VIDEO_QUALITY: "1080p" as VideoQuality,
};
