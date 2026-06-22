import { useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import {
  CAMERA_CONFIG,
  MAX_RECORDING_DURATION_SECONDS,
  MIN_RECORDING_DURATION_SECONDS,
} from "../constants/camera";
import { logout } from "../services/authService";
import { styles } from "../Styles/HomeScreen";
import { RootStackParamList } from "../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  const [maxDurationInput, setMaxDurationInput] = useState(String(CAMERA_CONFIG.MAX_DURATION));
  const parsedMaxDuration = Number(maxDurationInput);
  const maxDuration =
    Number.isInteger(parsedMaxDuration) &&
    parsedMaxDuration >= MIN_RECORDING_DURATION_SECONDS &&
    parsedMaxDuration <= MAX_RECORDING_DURATION_SECONDS
      ? parsedMaxDuration
      : null;

  async function handleLogout() {
    await logout();
    navigation.replace("Login");
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome Home</Text>
        <Text style={styles.subtitle}>Manage your recordings and tools below</Text>

        <View style={styles.durationSection}>
          <Text style={styles.durationLabel}>Maximum recording duration</Text>
          <View style={styles.durationInputRow}>
            <TextInput
              accessibilityLabel="Maximum recording duration in seconds"
              keyboardType="number-pad"
              maxLength={3}
              onChangeText={setMaxDurationInput}
              selectTextOnFocus
              style={[styles.durationInput, maxDuration === null && styles.durationInputInvalid]}
              value={maxDurationInput}
            />
            <Text style={styles.durationUnit}>seconds</Text>
          </View>
          <Text style={[styles.durationHint, maxDuration === null && styles.durationError]}>
            {maxDuration === null ? "Enter a whole number from 1 to 600." : "Recording stops automatically at this limit."}
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            disabled={maxDuration === null}
            style={[styles.primaryButton, maxDuration === null && styles.disabledButton]}
            onPress={() => maxDuration !== null && navigation.navigate("Camera", { maxDuration })}
          >
            <Text style={styles.primaryButtonText}>Open Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dashboardButton} onPress={() => navigation.navigate("Videos")}>
            <Text style={styles.dashboardButtonText}>Recorded Videos</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleLogout}>
            <Text style={styles.secondaryButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
