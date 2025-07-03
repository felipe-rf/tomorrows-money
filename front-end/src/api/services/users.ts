import { api } from "../config";
import { User, PaginatedResponse } from "../../types/api";

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  type?: number;
  active?: boolean;
  viewable_user_id?: number;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  password?: string;
  type?: number;
  active?: boolean;
}

export interface UserFilters {
  page?: number;
  limit?: number;
  type?: number;
  active?: boolean;
  search?: string;
  summary?: boolean;
  with_stats?: boolean;
}

export interface UserStats {
  user: {
    id: number;
    name: string;
    email: string;
    type: number;
    active: boolean;
    member_since: string;
  };
  financial: {
    total_transactions: number;
    total_income: number;
    total_expenses: number;
    net_balance: number;
  };
  organization: {
    total_categories: number;
  };
  goals: {
    total_goals: number;
    completed_goals: number;
    completion_rate: number;
  };
}

export class UserService {
  /**
   * Get all users (Admin only)
   */
  static async getAll(
    filters: UserFilters = {}
  ): Promise<PaginatedResponse<User>> {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });

      const response = await api.get<PaginatedResponse<User>>(
        `/users?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to fetch users");
    }
  }

  /**
   * Get user by ID or current user profile
   */
  static async getById(id: number | "me"): Promise<User> {
    try {
      const response = await api.get<User>(`/users/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to fetch user");
    }
  }

  /**
   * Get current user profile
   */
  static async getCurrentUser(): Promise<User> {
    return UserService.getById("me");
  }

  /**
   * Create new user
   */
  static async create(data: CreateUserData): Promise<User> {
    try {
      const response = await api.post<User>("/users", data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to create user");
    }
  }

  /**
   * Update user
   */
  static async update(id: number | "me", data: UpdateUserData): Promise<User> {
    try {
      const response = await api.put<User>(`/users/${id}`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to update user");
    }
  }

  /**
   * Update current user profile
   */
  static async updateProfile(data: UpdateUserData): Promise<User> {
    return UserService.update("me", data);
  }

  /**
   * Delete user (Admin only for other users, any user for themselves)
   */
  static async delete(id: number): Promise<void> {
    try {
      await api.delete(`/users/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to delete user");
    }
  }

  /**
   * Delete current user's own account
   */
  static async deleteSelf(): Promise<void> {
    try {
      await api.delete(`/users/me`);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to delete your account"
      );
    }
  }

  /**
   * Deactivate user (Admin only)
   */
  static async deactivate(id: number): Promise<User> {
    try {
      const response = await api.post<User>(`/users/${id}/deactivate`);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to deactivate user"
      );
    }
  }

  /**
   * Activate user (Admin only)
   */
  static async activate(id: number): Promise<User> {
    try {
      const response = await api.post<User>(`/users/${id}/activate`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to activate user");
    }
  }

  /**
   * Get user statistics
   */
  static async getStats(id: number | "me"): Promise<UserStats> {
    try {
      const response = await api.get<UserStats>(`/users/${id}/stats`);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch user stats"
      );
    }
  }

  /**
   * Get current user statistics
   */
  static async getCurrentUserStats(): Promise<UserStats> {
    return UserService.getStats("me");
  }

  /**
   * Create a viewer user (for regular users)
   */
  static async createViewer(data: Omit<CreateUserData, "type">): Promise<User> {
    return UserService.create({
      ...data,
      type: 2, // Viewer type
    });
  }

  /**
   * Get user type label
   */
  static getUserTypeLabel(type: number): string {
    switch (type) {
      case 0:
        return "Usuário";
      case 1:
        return "Administrador";
      case 2:
        return "Visualizador";
      default:
        return "Desconhecido";
    }
  }

  /**
   * Check if user can create other users
   */
  static canCreateUsers(userType: number): boolean {
    return userType === 0 || userType === 1; // Regular users and admins
  }

  /**
   * Check if user is admin
   */
  static isAdmin(userType: number): boolean {
    return userType === 1;
  }

  /**
   * Check if user is viewer
   */
  static isViewer(userType: number): boolean {
    return userType === 2;
  }
}
