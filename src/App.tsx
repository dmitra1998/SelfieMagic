import { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { initializeDatabase } from "./db/database";
import AppNavigator from "./navigation/AppNavigator";
import { startUploadSyncEngine } from "./services/uploadSyncEngine";

export default function App() {
  useEffect(() => {
    let stopUploadSync: (() => void) | undefined;
    let cancelled = false;

    async function initializeApp() {
      try {
        await initializeDatabase();
        const stop = await startUploadSyncEngine();

        if (cancelled) {
          stop();
        } else {
          stopUploadSync = stop;
        }
      } catch (error) {
        console.error("Failed to initialize local services:", error);
      }
    }

    void initializeApp();

    return () => {
      cancelled = true;
      stopUploadSync?.();
    };
  }, []);

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}
