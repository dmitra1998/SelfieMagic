import { RefObject } from "react";
import { StyleSheet } from "react-native";
import { CameraType, CameraView } from "expo-camera";
import { CAMERA_CONFIG } from "../../constants/camera";

type CameraPreviewProps = {
  active: boolean;
  cameraRef: RefObject<CameraView | null>;
  cameraType: CameraType;
  onCameraReady: () => void;
  onMountError: (event: { message: string }) => void;
};

export default function CameraPreview({
  active,
  cameraRef,
  cameraType,
  onCameraReady,
  onMountError,
}: CameraPreviewProps) {
  return (
    <CameraView
      active={active}
      facing={cameraType}
      mode="video"
      onCameraReady={onCameraReady}
      onMountError={onMountError}
      ref={cameraRef}
      style={styles.preview}
      videoQuality={CAMERA_CONFIG.VIDEO_QUALITY}
    />
  );
}

const styles = StyleSheet.create({
  preview: {
    flex: 1,
  },
});
