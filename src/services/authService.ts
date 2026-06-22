import { clearAuthSession, loadAuthSession, saveAuthSession } from "../storage/authStorage";

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
  await saveAuthSession({ token, workerId: normalizedEmail });

  return { success: true, token };
}

export async function logout(): Promise<void> {
  await clearAuthSession();
}

export async function isAuthenticated(): Promise<boolean> {
  return (await loadAuthSession()) !== null;
}

export async function getAuthenticatedWorkerId(): Promise<string> {
  const session = await loadAuthSession();
  if (!session) {
    throw new Error("No authenticated worker session is available.");
  }
  return session.workerId;
}
