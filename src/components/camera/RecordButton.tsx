import { Pressable, StyleSheet, Text } from "react-native";

type RecordButtonProps = {
  disabled: boolean;
  recording: boolean;
  saving: boolean;
  onPress: () => void;
};

export default function RecordButton({ disabled, recording, saving, onPress }: RecordButtonProps) {
  const title = saving ? "Saving" : recording ? "Stop" : "Record";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || saving}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        recording && styles.stopButton,
        (disabled || saving) && styles.disabledButton,
        pressed && !disabled && !saving && styles.pressedButton,
      ]}
    >
      <Text style={styles.label}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: "#dc2626",
    borderRadius: 36,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  disabledButton: {
    opacity: 0.45,
  },
  label: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  pressedButton: {
    transform: [{ scale: 0.96 }],
  },
  stopButton: {
    backgroundColor: "#111827",
  },
});
