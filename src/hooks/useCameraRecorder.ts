import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CameraType, CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import * as Battery from "expo-battery";
import * as Location from "expo-location";
import * as Network from "expo-network";
import { CAMERA_CONFIG } from "../constants/camera";
import { saveRecordedVideo, saveRecordingMetadata } from "../services/videoService";
import type { GpsCoordinates, GpsStatus, RecordingMetadata, RecordingStatus, UploadNetworkType } from "../types/recording";

type UseCameraRecorderOptions = {
  isActive: boolean;
};

function toGpsCoordinates(location: Location.LocationObject): GpsCoordinates {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
    capturedAt: new Date(location.timestamp).toISOString(),
  };
}

export function formatBatteryPercentage(level: number | null): string {
  if (level === null || level < 0) {
    return "Unavailable";
  }

  return `${Math.round(level * 100)}%`;
}

export async function getNetworkTypeAtUpload(): Promise<UploadNetworkType> {
  const network = await Network.getNetworkStateAsync();

  if (!network.isConnected || network.type === Network.NetworkStateType.NONE) {
    return "none";
  }

  if (network.type === Network.NetworkStateType.WIFI) {
    return "wifi";
  }

  if (network.type === Network.NetworkStateType.CELLULAR) {
    return "cellular";
  }

  return "unknown";
}

export function useCameraRecorder({ isActive }: UseCameraRecorderOptions) {
  const cameraRef = useRef<CameraView>(null);
  const readyGpsRef = useRef<GpsCoordinates | null>(null);
  const recordingStatusRef = useRef<RecordingStatus>("idle");

  const [cameraType, setCameraType] = useState<CameraType>("back");
  const [cameraReady, setCameraReady] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>("idle");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("idle");
  const [readyGps, setReadyGps] = useState<GpsCoordinates | null>(null);
  const [recordingStartGps, setRecordingStartGps] = useState<GpsCoordinates | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [batteryLevelAtStart, setBatteryLevelAtStart] = useState<number | null>(null);
  const [batteryLevelAtEnd, setBatteryLevelAtEnd] = useState<number | null>(null);
  const [lastRecordingMetadata, setLastRecordingMetadata] = useState<RecordingMetadata | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [permissionRequestCount, setPermissionRequestCount] = useState(0);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();

  const isRecording = recordingStatus === "recording";
  const isSaving = recordingStatus === "saving";
  const hasCameraPermission = cameraPermission?.granted === true;
  const hasMicrophonePermission = microphonePermission?.granted === true;
  const hasMediaPermissions = hasCameraPermission && hasMicrophonePermission;

  const canRecord = useMemo(
    () => isActive && cameraReady && hasMediaPermissions && gpsStatus === "ready" && Boolean(readyGps) && recordingStatus === "idle",
    [cameraReady, gpsStatus, hasMediaPermissions, isActive, readyGps, recordingStatus]
  );

  useEffect(() => {
    recordingStatusRef.current = recordingStatus;
  }, [recordingStatus]);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialBatteryLevel() {
      try {
        const currentBatteryLevel = await Battery.getBatteryLevelAsync();

        if (!cancelled) {
          setBatteryLevel(currentBatteryLevel);
        }
      } catch {
        if (!cancelled) {
          setBatteryLevel(-1);
        }
      }
    }

    loadInitialBatteryLevel();

    const subscription = Battery.addBatteryLevelListener(({ batteryLevel: nextBatteryLevel }) => {
      setBatteryLevel(nextBatteryLevel);
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const timerId = setInterval(() => {
      setElapsedTime((current) => current + 1);
    }, 1000);

    return () => {
      clearInterval(timerId);
    };
  }, [isRecording]);

  useEffect(() => {
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    async function prepareGps() {
      if (!isActive) {
        return;
      }

      setGpsStatus("checking");

      try {
        const permission = await Location.getForegroundPermissionsAsync();

        if (cancelled) {
          return;
        }

        if (permission.status !== "granted") {
          readyGpsRef.current = null;
          setReadyGps(null);
          setGpsStatus(permission.canAskAgain ? "idle" : "denied");
          return;
        }

        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        if (cancelled) {
          return;
        }

        const initialGps = toGpsCoordinates(initialLocation);
        readyGpsRef.current = initialGps;
        setReadyGps(initialGps);
        setGpsStatus("ready");

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 5,
            timeInterval: 5000,
          },
          (location) => {
            const gps = toGpsCoordinates(location);
            readyGpsRef.current = gps;
            setReadyGps(gps);
            setGpsStatus("ready");
          }
        );
      } catch (error) {
        if (!cancelled) {
          console.error("Error while preparing GPS:", error);
          readyGpsRef.current = null;
          setReadyGps(null);
          setGpsStatus("error");
        }
      }
    }

    prepareGps();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [isActive, permissionRequestCount]);

  const requestRequiredPermissions = useCallback(async () => {
    setErrorMessage(null);
    setGpsStatus("checking");

    const cameraResult = await requestCameraPermission();
    if (!cameraResult.granted) {
      setGpsStatus("idle");
      setErrorMessage("Camera permission is required to record.");
      return;
    }

    const microphoneResult = await requestMicrophonePermission();
    if (!microphoneResult.granted) {
      setGpsStatus("idle");
      setErrorMessage("Microphone permission is required to record video with audio.");
      return;
    }

    const locationResult = await Location.requestForegroundPermissionsAsync();
    if (locationResult.status !== "granted") {
      setGpsStatus("denied");
      setErrorMessage("Location permission is required to capture GPS coordinates at recording start.");
      return;
    }

    setPermissionRequestCount((current) => current + 1);
  }, [requestCameraPermission, requestMicrophonePermission]);

  const handleCameraReady = useCallback(() => {
    setCameraReady(true);
    setErrorMessage(null);
  }, []);

  const handleCameraMountError = useCallback((event: { message: string }) => {
    setCameraReady(false);
    setErrorMessage(event.message || "Camera could not be started.");
  }, []);

  const startRecording = useCallback(async () => {
    const gpsAtStart = readyGpsRef.current;

    if (!cameraRef.current || !canRecord || !gpsAtStart) {
      return;
    }

    setElapsedTime(0);
    setBatteryLevelAtEnd(null);
    setLastRecordingMetadata(null);
    setRecordingStartGps(gpsAtStart);
    setRecordingStatus("preparing");
    setErrorMessage(null);

    try {
      const batteryStart = await Battery.getBatteryLevelAsync();
      setBatteryLevelAtStart(batteryStart);
      setRecordingStatus("recording");

      const video = await cameraRef.current.recordAsync({
        maxDuration: CAMERA_CONFIG.MAX_DURATION,
      });

      setRecordingStatus("saving");

      const batteryEnd = await Battery.getBatteryLevelAsync();
      setBatteryLevelAtEnd(batteryEnd);
      setBatteryLevel(batteryEnd);

      if (!video?.uri) {
        throw new Error("Camera did not return a video file.");
      }

      const savedUri = await saveRecordedVideo(video.uri);
      const metadata: RecordingMetadata = {
        gpsAtStart,
        batteryLevelAtStart: batteryStart,
        batteryLevelAtEnd: batteryEnd,
        savedUri,
        recordedAt: new Date().toISOString(),
      };

      await saveRecordingMetadata(metadata);
      setLastRecordingMetadata(metadata);
      console.info("Recording metadata:", metadata);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error while recording video.";
      console.error("Error while recording video:", error);
      setErrorMessage(message);
    } finally {
      setRecordingStatus("idle");
    }
  }, [canRecord]);

  const stopRecording = useCallback(() => {
    if (cameraRef.current && recordingStatusRef.current === "recording") {
      cameraRef.current.stopRecording();
    }
  }, []);

  const toggleCamera = useCallback(() => {
    setCameraReady(false);
    setCameraType((current) => (current === "back" ? "front" : "back"));
  }, []);

  return {
    batteryLevel,
    batteryLevelAtEnd,
    batteryLevelAtStart,
    cameraPermission,
    cameraReady,
    cameraRef,
    cameraType,
    canRecord,
    elapsedTime,
    errorMessage,
    gpsStatus,
    hasMediaPermissions,
    isRecording,
    isSaving,
    lastRecordingMetadata,
    readyGps,
    recordingStartGps,
    recordingStatus,
    handleCameraMountError,
    handleCameraReady,
    requestRequiredPermissions,
    startRecording,
    stopRecording,
    toggleCamera,
  };
}
