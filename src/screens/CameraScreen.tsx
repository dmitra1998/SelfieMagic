import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import CameraControls from "../components/camera/CameraControls";
import CameraPreview from "../components/camera/CameraPreview";
import TimerIndicator from "../components/camera/TimerIndicator";
import { CAMERA_CONFIG } from "../constants/camera";
import { formatBatteryPercentage, useCameraRecorder } from "../hooks/useCameraRecorder";
import type { RootStackParamList } from "../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Camera">;

function formatGps(latitude: number, longitude: number) {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

export default function CameraScreen({ route }: Props) {
  const isFocused = useIsFocused();
  const maxDurationSeconds = route.params?.maxDuration ?? CAMERA_CONFIG.MAX_DURATION;
  const {
    batteryLevel,
    batteryLevelAtEnd,
    batteryLevelAtStart,
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
  } = useCameraRecorder({ isActive: isFocused, maxDurationSeconds });

  const displayedGps = isRecording ? recordingStartGps ?? readyGps : readyGps;
  const gpsText = displayedGps ? formatGps(displayedGps.latitude, displayedGps.longitude) : "Waiting for GPS";
  const batteryText = isRecording
    ? `Start ${formatBatteryPercentage(batteryLevelAtStart ?? batteryLevel)}`
    : batteryLevelAtEnd !== null
      ? `Start ${formatBatteryPercentage(batteryLevelAtStart)} | End ${formatBatteryPercentage(batteryLevelAtEnd)}`
      : formatBatteryPercentage(batteryLevel);

  const readinessText = !hasMediaPermissions
    ? "Permissions required"
    : gpsStatus === "ready"
      ? cameraReady
        ? "Ready"
        : "Starting camera"
      : gpsStatus === "denied"
        ? "Location denied"
        : gpsStatus === "error"
          ? "GPS unavailable"
          : "Finding GPS";

  if (!hasMediaPermissions || gpsStatus === "idle" || gpsStatus === "denied") {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <View style={styles.permissionContent}>
          <Text style={styles.permissionTitle}>Camera setup required</Text>
          <Text style={styles.permissionBody}>Camera, microphone, and location access are needed before recording can start.</Text>
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          <Pressable accessibilityRole="button" onPress={requestRequiredPermissions} style={styles.permissionButton}>
            <Text style={styles.permissionButtonLabel}>Allow access</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraPreview
        active={isFocused && hasMediaPermissions}
        cameraRef={cameraRef}
        cameraType={cameraType}
        onCameraReady={handleCameraReady}
        onMountError={handleCameraMountError}
      />

      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        <View style={styles.statusPanel}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status</Text>
            <Text style={styles.statusValue}>
              {isSaving ? "Saving" : isRecording ? "Recording" : recordingStatus === "preparing" ? "Preparing" : readinessText}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>GPS</Text>
            <Text style={styles.statusValue}>{gpsText}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Battery</Text>
            <Text style={styles.statusValue}>{batteryText}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Limit</Text>
            <Text style={styles.statusValue}>{maxDurationSeconds} seconds</Text>
          </View>
          {lastRecordingMetadata ? <Text style={styles.savedText}>Last video saved</Text> : null}
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        </View>

        <View style={styles.bottomPanel}>
          <TimerIndicator seconds={elapsedTime} />
          <CameraControls
            canRecord={canRecord}
            recording={isRecording}
            saving={isSaving}
            onStart={startRecording}
            onStop={stopRecording}
            onSwitch={toggleCamera}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomPanel: {
    gap: 18,
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  container: {
    backgroundColor: "#000000",
    flex: 1,
  },
  errorText: {
    color: "#fecaca",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    textAlign: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  permissionBody: {
    color: "#4b5563",
    fontSize: 16,
    lineHeight: 23,
    textAlign: "center",
  },
  permissionButton: {
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 8,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  permissionButtonLabel: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  permissionContainer: {
    backgroundColor: "#f9fafb",
    flex: 1,
  },
  permissionContent: {
    alignItems: "center",
    flex: 1,
    gap: 18,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  permissionTitle: {
    color: "#111827",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  savedText: {
    color: "#bbf7d0",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  statusLabel: {
    color: "#d1d5db",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    width: 64,
  },
  statusPanel: {
    alignSelf: "center",
    backgroundColor: "rgba(17, 24, 39, 0.78)",
    borderRadius: 8,
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    maxWidth: 420,
    padding: 12,
    width: "92%",
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  statusValue: {
    color: "#ffffff",
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },
});
