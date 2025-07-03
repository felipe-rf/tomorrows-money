import { api } from "../config";
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from "../../types/api";
export class AuthService {
  /**
   * Register a new user
   */
  static async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>("/auth/register", data);

      // Store token and user data
      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
      }

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Registration failed");
    }
  }

  /**
   * Login user
   */
  static async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>("/auth/login", data);

      // Store token and user data
      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
      }

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Login failed");
    }
  }

  /**
   * Logout user
   */
  static logout(): void {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  /**
   * Get current user from localStorage
   */
  static getCurrentUser(): User | null {
    try {
      const userStr = localStorage.getItem("user");
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return !!localStorage.getItem("token");
  }

  /**
   * Get auth token
   */
  static getToken(): string | null {
    return localStorage.getItem("token");
  }
}
