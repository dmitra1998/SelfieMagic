import { useState, useRef, useEffect } from "react";
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import { CAMERA_CONFIG } from "../constants/camera";
import { saveVideo } from "../services/videoService";

export function useCameraRecorder() {
  const cameraRef = useRef<CameraView>(null);
  const [cameraType, setCameraType] = useState<CameraType>("back");
  const [isRecording, setRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();

  useEffect(() => {
    if (!cameraPermission?.granted) requestCameraPermission();
    if (!microphonePermission?.granted) requestMicrophonePermission();
  }, [cameraPermission, microphonePermission]);

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

    try {
      setElapsedTime(0);

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

      if (video?.uri) {
        const savedPath = await saveVideo(video.uri);
        console.log("Saved:", savedPath);
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
    startRecording,
    stopRecording,
    toggleCamera,
  };
}