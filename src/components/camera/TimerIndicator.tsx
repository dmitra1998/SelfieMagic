import { StyleSheet, Text } from "react-native";

type TimerIndicatorProps = {
  seconds: number;
};

export default function TimerIndicator({ seconds }: TimerIndicatorProps) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainingSeconds = (seconds % 60).toString().padStart(2, "0");

  return <Text style={styles.text}>{minutes}:{remainingSeconds}</Text>;
}

const styles = StyleSheet.create({
  text: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
});
