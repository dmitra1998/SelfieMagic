import { useState, useRef, useEffect } from "react";
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import * as Battery from "expo-battery";
import * as Location from "expo-location";
import * as Network from "expo-network";
import { CAMERA_CONFIG } from "../constants/camera";
import { saveVideo } from "../services/videoService";

type GpsCoordinates = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  capturedAt: string;
};

type RecordingMetadata = {
  gpsAtStart: GpsCoordinates;
  batteryLevelAtStart: number;
  batteryLevelAtEnd: number | null;
};

export type UploadNetworkType = "wifi" | "cellular" | "none" | "unknown";

function toGpsCoordinates(location: Location.LocationObject): GpsCoordinates {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
    capturedAt: new Date(location.timestamp).toISOString(),
  };
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

export function useCameraRecorder() {
  const cameraRef = useRef<CameraView>(null);
  const readyGpsRef = useRef<GpsCoordinates | null>(null);
  const [cameraType, setCameraType] = useState<CameraType>("back");
  const [isRecording, setRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [gpsStatus, setGpsStatus] = useState<"checking" | "ready" | "denied" | "error">("checking");
  const [readyGps, setReadyGps] = useState<GpsCoordinates | null>(null);
  const [recordingStartGps, setRecordingStartGps] = useState<GpsCoordinates | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [batteryLevelAtStart, setBatteryLevelAtStart] = useState<number | null>(null);
  const [batteryLevelAtEnd, setBatteryLevelAtEnd] = useState<number | null>(null);
  const [lastRecordingMetadata, setLastRecordingMetadata] = useState<RecordingMetadata | null>(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();

  useEffect(() => {
    if (!cameraPermission?.granted) requestCameraPermission();
    if (!microphonePermission?.granted) requestMicrophonePermission();
  }, [cameraPermission, microphonePermission]);

  useEffect(() => {
    let cancelled = false;

    async function prepareBattery() {
      const currentBatteryLevel = await Battery.getBatteryLevelAsync();

      if (!cancelled) {
        setBatteryLevel(currentBatteryLevel);
      }
    }

    prepareBattery();

    const subscription = Battery.addBatteryLevelListener(({ batteryLevel: nextBatteryLevel }) => {
      setBatteryLevel(nextBatteryLevel);
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    async function prepareGps() {
      try {
        setGpsStatus("checking");

        const permission = await Location.requestForegroundPermissionsAsync();

        if (permission.status !== "granted") {
          setGpsStatus("denied");
          return;
        }

        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        if (cancelled) return;

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
        console.error("Error while preparing GPS:", error);
        setGpsStatus("error");
      }
    }

    prepareGps();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  // 1. FIXED TIMER LOGIC
  useEffect(() => {
    let timer: any;

    if (isRecording) {
      timer = setInterval(() => {
        setElapsedTime((prev) => {
          // REMOVED: The manual stopRecording() call here is gone!
          // We let the UI timer just sit back and display the time.
          return prev + 1;
        });
      }, 1000);
    }

    return () => {
      clearInterval(timer);
    };
  }, [isRecording]);

  // 2. FIXED START LOGIC
  async function startRecording() {
    if (!cameraRef.current) return;
    if (!cameraPermission?.granted || !microphonePermission?.granted) return;
    const gpsAtStart = readyGpsRef.current;

    if (!gpsAtStart) {
      console.warn("GPS is not ready yet. Recording was not started.");
      return;
    }

    try {
      setElapsedTime(0);
      setLastRecordingMetadata(null);
      setBatteryLevelAtEnd(null);

      const batteryStart = await Battery.getBatteryLevelAsync();

      setBatteryLevelAtStart(batteryStart);
      setRecordingStartGps(gpsAtStart);

      // Kick off the native camera recording first
      const recordingPromise = cameraRef.current.recordAsync({
        maxDuration: CAMERA_CONFIG.MAX_DURATION,
      });

      // DELAY HACK: Wait 300ms for the native hardware layer to open 
      // before turning on the visible UI countdown timer.
      setTimeout(() => {
        setRecording(true);
      }, 300);

      // Code pauses here until the maxDuration hits OR you call stopRecording()
      const video = await recordingPromise;
      const batteryEnd = await Battery.getBatteryLevelAsync();

      setBatteryLevelAtEnd(batteryEnd);
      setBatteryLevel(batteryEnd);

      const metadata = {
        gpsAtStart,
        batteryLevelAtStart: batteryStart,
        batteryLevelAtEnd: batteryEnd,
      };

      setLastRecordingMetadata(metadata);

      if (video?.uri) {
        const savedPath = await saveVideo(video.uri);
        console.log("Saved:", savedPath);
        console.log("Recording metadata:", metadata);
      }
    } catch (error) {
      console.error("Error while recording video:", error);
    } finally {
      // Turn off recording state uniformly
      setRecording(false);
    }
  }

  function stopRecording() {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
    }
  }

  function toggleCamera() {
    setCameraType((prev) => (prev === "back" ? "front" : "back"));
  }

  return {
    cameraRef,
    cameraType,
    isRecording,
    elapsedTime,
    gpsStatus,
    readyGps,
    recordingStartGps,
    batteryLevel,
    batteryLevelAtStart,
    batteryLevelAtEnd,
    lastRecordingMetadata,
    startRecording,
    stopRecording,
    toggleCamera,
  };
}
