import { apiClient } from "./client";

interface LoginCredentials {
  name: string;
  email: string;
}

export async function login(credentials: LoginCredentials): Promise<void> {
  await apiClient.post("/auth/login", credentials);
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function checkAuth(): Promise<boolean> {
  try {
    await apiClient.get("/auth/check");
    return true;
  } catch {
    return false;
  }
}
