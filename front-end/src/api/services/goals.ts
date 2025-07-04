import { api } from "../config";
import { PaginatedResponse, Goal } from "../../types/api";

export interface GoalFilters {
  page?: number;
  limit?: number;
  priority?: "low" | "medium" | "high";
  is_completed?: boolean;
  category_id?: number;
  user_id?: number;
  status?: "active" | "completed" | "overdue";
  startDate?: string;
  endDate?: string;
  summary?: boolean;
  progress?: boolean;
  search?: string;
}

export interface CreateGoalData {
  name: string;
  target_amount: number;
  target_date?: string;
  category_id?: number;
  description?: string;
  color?: string;
  icon?: string;
  priority?: "low" | "medium" | "high";
  auto_deduct?: boolean;
  current_amount?: number;
  target_user_id?: number; // For admin users
}

export interface GoalSummary {
  overview: {
    total_goals: number;
    active_goals: number;
    completed_goals: number;
    overdue_goals: number;
    completion_rate: number;
  };
  financial: {
    total_target_amount: number;
    total_current_amount: number;
    total_remaining_amount: number;
    overall_progress_percentage: number;
  };
  by_priority: Array<{
    priority: string;
    count: number;
  }>;
}

export interface GoalProgress {
  goal: Goal;
  milestones: Array<{
    percentage: number;
    amount: number;
    achieved: boolean;
  }>;
  next_milestone: {
    percentage: number;
    amount: number;
    achieved: boolean;
  } | null;
}

export interface AddProgressData {
  amount: number;
}

export interface AddProgressResponse {
  goal: Goal;
  message: string;
  progress_added: number;
}

export class GoalService {
  /**
   * Get all goals with optional filtering
   */
  static async getAll(
    filters: GoalFilters = {}
  ): Promise<PaginatedResponse<Goal>> {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });

      const response = await api.get<PaginatedResponse<Goal>>(
        `/goals?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to fetch goals");
    }
  }

  /**
   * Get goal by ID
   */
  static async getById(id: number): Promise<Goal> {
    try {
      const response = await api.get<Goal>(`/goals/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to fetch goal");
    }
  }

  /**
   * Create new goal
   */
  static async create(data: CreateGoalData): Promise<Goal> {
    try {
      const response = await api.post<Goal>("/goals", data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to create goal");
    }
  }

  /**
   * Update goal
   */
  static async update(
    id: number,
    data: Partial<CreateGoalData>
  ): Promise<Goal> {
    try {
      const response = await api.put<Goal>(`/goals/${id}`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to update goal");
    }
  }

  /**
   * Delete goal
   */
  static async delete(id: number): Promise<void> {
    try {
      await api.delete(`/goals/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to delete goal");
    }
  }

  /**
   * Get goals summary
   */
  static async getSummary(user_id?: number): Promise<GoalSummary> {
    try {
      const params = new URLSearchParams();
      params.append("summary", "true");
      if (user_id) {
        params.append("user_id", user_id.toString());
      }

      const response = await api.get<GoalSummary>(
        `/goals?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch goals summary"
      );
    }
  }

  /**
   * Get goals with progress data
   */
  static async getProgress(user_id?: number): Promise<{ data: Goal[] }> {
    try {
      const params = new URLSearchParams();
      params.append("progress", "true");
      if (user_id) {
        params.append("user_id", user_id.toString());
      }

      const response = await api.get<{ data: Goal[] }>(
        `/goals?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch goals progress"
      );
    }
  }

  /**
   * Search goals by name
   */
  static async search(
    searchTerm: string,
    limit: number = 10
  ): Promise<{ data: Goal[]; search_term: string }> {
    try {
      const params = new URLSearchParams();
      params.append("search", searchTerm);
      params.append("limit", limit.toString());

      const response = await api.get<{ data: Goal[]; search_term: string }>(
        `/goals?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to search goals");
    }
  }

  /**
   * Add progress to a goal
   */
  static async addProgress(
    id: number,
    data: AddProgressData
  ): Promise<AddProgressResponse> {
    try {
      const response = await api.post<AddProgressResponse>(
        `/goals/${id}/progress`,
        data
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to add progress to goal"
      );
    }
  }

  /**
   * Get goal progress details with milestones
   */
  static async getGoalProgress(id: number): Promise<GoalProgress> {
    try {
      const response = await api.get<GoalProgress>(`/goals/${id}/progress`);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch goal progress"
      );
    }
  }

  /**
   * Get goals by status (helper method)
   */
  static async getByStatus(
    status: "active" | "completed" | "overdue",
    user_id?: number
  ): Promise<PaginatedResponse<Goal>> {
    return this.getAll({ status, user_id });
  }

  /**
   * Get goals by priority (helper method)
   */
  static async getByPriority(
    priority: "low" | "medium" | "high",
    user_id?: number
  ): Promise<PaginatedResponse<Goal>> {
    return this.getAll({ priority, user_id });
  }

  /**
   * Get goals by category (helper method)
   */
  static async getByCategory(
    category_id: number,
    user_id?: number
  ): Promise<PaginatedResponse<Goal>> {
    return this.getAll({ category_id, user_id });
  }

  /**
   * Get overdue goals (helper method)
   */
  static async getOverdue(user_id?: number): Promise<PaginatedResponse<Goal>> {
    return this.getByStatus("overdue", user_id);
  }

  /**
   * Get active goals (helper method)
   */
  static async getActive(user_id?: number): Promise<PaginatedResponse<Goal>> {
    return this.getByStatus("active", user_id);
  }

  /**
   * Get completed goals (helper method)
   */
  static async getCompleted(
    user_id?: number
  ): Promise<PaginatedResponse<Goal>> {
    return this.getByStatus("completed", user_id);
  }
}
