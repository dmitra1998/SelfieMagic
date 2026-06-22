import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const SECURE_SESSION_KEY = "auth.session.v1";
const LEGACY_TOKEN_KEY = "authToken";
const LEGACY_SESSION_KEY = "authSession";

export type StoredAuthSession = {
  token: string;
  workerId: string;
};

function parseSession(value: string | null): StoredAuthSession | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<StoredAuthSession>;
    if (typeof parsed.token === "string" && parsed.token && typeof parsed.workerId === "string" && parsed.workerId) {
      return { token: parsed.token, workerId: parsed.workerId };
    }
  } catch {
    return null;
  }

  return null;
}

async function migrateLegacySession(): Promise<StoredAuthSession | null> {
  const values = await AsyncStorage.multiGet([LEGACY_TOKEN_KEY, LEGACY_SESSION_KEY]);
  const token = values[0]?.[1];
  const rawSession = values[1]?.[1];

  if (!token) {
    await AsyncStorage.multiRemove([LEGACY_TOKEN_KEY, LEGACY_SESSION_KEY]);
    return null;
  }

  let workerId: string | null = null;
  if (rawSession) {
    try {
      const session = JSON.parse(rawSession) as { workerId?: unknown };
      workerId = typeof session.workerId === "string" && session.workerId ? session.workerId : null;
    } catch {
      workerId = null;
    }
  }

  if (!workerId) {
    await AsyncStorage.multiRemove([LEGACY_TOKEN_KEY, LEGACY_SESSION_KEY]);
    return null;
  }

  const migrated = { token, workerId };
  await SecureStore.setItemAsync(SECURE_SESSION_KEY, JSON.stringify(migrated));
  await AsyncStorage.multiRemove([LEGACY_TOKEN_KEY, LEGACY_SESSION_KEY]);
  return migrated;
}

export async function saveAuthSession(session: StoredAuthSession): Promise<void> {
  await SecureStore.setItemAsync(SECURE_SESSION_KEY, JSON.stringify(session));
  await AsyncStorage.multiRemove([LEGACY_TOKEN_KEY, LEGACY_SESSION_KEY]);
}

export async function loadAuthSession(): Promise<StoredAuthSession | null> {
  const secureSession = parseSession(await SecureStore.getItemAsync(SECURE_SESSION_KEY));
  return secureSession ?? migrateLegacySession();
}

export async function clearAuthSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(SECURE_SESSION_KEY),
    AsyncStorage.multiRemove([LEGACY_TOKEN_KEY, LEGACY_SESSION_KEY]),
  ]);
}
