import { Pressable, StyleSheet, Text, View } from "react-native";
import RecordButton from "./RecordButton";

type CameraControlsProps = {
  canRecord: boolean;
  recording: boolean;
  saving: boolean;
  onStart: () => void;
  onStop: () => void;
  onSwitch: () => void;
};

export default function CameraControls({
  canRecord,
  recording,
  saving,
  onStart,
  onStop,
  onSwitch,
}: CameraControlsProps) {
  const recordDisabled = !recording && !canRecord;

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        disabled={saving}
        onPress={onSwitch}
        style={({ pressed }) => [
          styles.secondaryButton,
          saving && styles.disabledButton,
          pressed && !saving && styles.pressedButton,
        ]}
      >
        <Text style={styles.secondaryLabel}>Flip</Text>
      </Pressable>

      <RecordButton disabled={recordDisabled} recording={recording} saving={saving} onPress={recording ? onStop : onStart} />

      <View style={styles.secondaryButtonPlaceholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  disabledButton: {
    opacity: 0.45,
  },
  pressedButton: {
    transform: [{ scale: 0.96 }],
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "rgba(17, 24, 39, 0.74)",
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 72,
  },
  secondaryButtonPlaceholder: {
    width: 72,
  },
  secondaryLabel: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});
