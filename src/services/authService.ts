import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_TOKEN_STORAGE_KEY = "authToken";
const AUTH_SESSION_STORAGE_KEY = "authSession";
const DEVELOPMENT_USER = {
  email: "test@gmail.com",
  password: "123456",
};

type LoginResult =
  | {
      success: true;
      token: string;
    }
  | {
      success: false;
      token: null;
    };

export async function login(email: string, password: string): Promise<LoginResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const validCredentials = normalizedEmail === DEVELOPMENT_USER.email && password === DEVELOPMENT_USER.password;

  if (!validCredentials) {
    return { success: false, token: null };
  }

  const token = `development-token-${Date.now()}`;
  await AsyncStorage.multiSet([
    [AUTH_TOKEN_STORAGE_KEY, token],
    [AUTH_SESSION_STORAGE_KEY, JSON.stringify({ workerId: normalizedEmail })],
  ]);

  return { success: true, token };
}

export async function logout(): Promise<void> {
  await AsyncStorage.multiRemove([AUTH_TOKEN_STORAGE_KEY, AUTH_SESSION_STORAGE_KEY]);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await AsyncStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  return token !== null;
}

export async function getAuthenticatedWorkerId(): Promise<string> {
  const [token, rawSession] = await AsyncStorage.multiGet([AUTH_TOKEN_STORAGE_KEY, AUTH_SESSION_STORAGE_KEY]);

  if (!token[1]) {
    throw new Error("No authenticated worker session is available.");
  }

  if (rawSession[1]) {
    try {
      const session = JSON.parse(rawSession[1]) as { workerId?: unknown };
      if (typeof session.workerId === "string" && session.workerId.length > 0) {
        return session.workerId;
      }
    } catch {
      // Fall through for sessions created before worker IDs were persisted.
    }
  }

  return DEVELOPMENT_USER.email;
}
