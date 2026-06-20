import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_TOKEN_STORAGE_KEY = "authToken";
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
  const validCredentials = email.trim().toLowerCase() === DEVELOPMENT_USER.email && password === DEVELOPMENT_USER.password;

  if (!validCredentials) {
    return { success: false, token: null };
  }

  const token = `development-token-${Date.now()}`;
  await AsyncStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);

  return { success: true, token };
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await AsyncStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  return token !== null;
}
