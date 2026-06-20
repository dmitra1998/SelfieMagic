import { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { initializeDatabase } from "./db/database";
import AppNavigator from "./navigation/AppNavigator";

export default function App() {
  useEffect(() => {
    initializeDatabase().catch((error) => {
      console.error("Failed to initialize the local database:", error);
    });
  }, []);

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}
