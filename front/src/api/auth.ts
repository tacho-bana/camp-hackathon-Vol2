import { get, post } from "./client";
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  UserResponse,
} from "../types/api";

export async function postRegister(
  payload: RegisterRequest,
): Promise<AuthResponse> {
  return post<AuthResponse>("/auth/register", payload);
}

export async function postLogin(payload: LoginRequest): Promise<AuthResponse> {
  return post<AuthResponse>("/auth/login", payload);
}

export async function getMe(): Promise<UserResponse> {
  return get<UserResponse>("/auth/me");
}

export async function postLogout(): Promise<{ message: string }> {
  return post<{ message: string }>("/auth/logout");
}
