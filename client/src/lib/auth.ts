import { apiRequest } from "./queryClient";

export interface RegisterData {
  name: string;
  username: string;
  email: string;
  password: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export async function registerUser(data: RegisterData) {
  return await apiRequest("POST", "/api/auth/register", data);
}

export async function loginUser(data: LoginData) {
  return await apiRequest("POST", "/api/auth/login", data);
}

export async function logoutUser() {
  return await apiRequest("POST", "/api/auth/logout", {});
}

export async function getCurrentUser() {
  return await apiRequest("GET", "/api/auth/me", undefined);
}
