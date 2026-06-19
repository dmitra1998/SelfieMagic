// HomeScreen.tsx
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { logout } from "../services/authService";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";

// Import your newly created external styles
import { styles } from "../Styles/HomeScreen";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  async function handleLogout() {
    await logout();
    navigation.navigate("Login");
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome Home</Text>
        <Text style={styles.subtitle}>Manage your tasks and tools below</Text>

        <View style={styles.buttonContainer}>
          {/* Main action button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate("Camera")}
          >
            <Text style={styles.primaryButtonText}>📸 Open Camera</Text>
          </TouchableOpacity>

          {/* Logout action button */}
          <TouchableOpacity style={styles.secondaryButton} onPress={handleLogout}>
            <Text style={styles.secondaryButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}