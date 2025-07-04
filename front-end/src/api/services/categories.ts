import { api } from "../config";
import { Category, PaginatedResponse } from "../../types/api";

export interface CategoryFilters {
  page?: number;
  limit?: number;
  name?: string;
  color?: string;
  user_id?: number;
  summary?: boolean;
  with_counts?: boolean;
  by_type?: boolean;
}

export interface CreateCategoryData {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  target_user_id?: number;
}

export class CategoryService {
  /**
   * Get all categories
   */
  static async getAll(
    filters: CategoryFilters = {}
  ): Promise<PaginatedResponse<Category>> {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });

      const response = await api.get<PaginatedResponse<Category>>(
        `/categories?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch categories"
      );
    }
  }

  /**
   * Get category by ID
   */
  static async getById(id: number): Promise<Category> {
    try {
      const response = await api.get<Category>(`/categories/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch category"
      );
    }
  }

  /**
   * Create new category
   */
  static async create(data: CreateCategoryData): Promise<Category> {
    try {
      const response = await api.post<Category>("/categories", data);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to create category"
      );
    }
  }

  /**
   * Update category
   */
  static async update(
    id: number,
    data: Partial<CreateCategoryData>
  ): Promise<Category> {
    try {
      const response = await api.put<Category>(`/categories/${id}`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to update category"
      );
    }
  }

  /**
   * Delete category
   */
  static async delete(id: number): Promise<void> {
    try {
      await api.delete(`/categories/${id}`);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to delete category"
      );
    }
  }

  /**
   * Get transactions for a specific category
   */
  static async getTransactions(
    id: number,
    params: { page?: number; limit?: number; user_id?: number } = {}
  ): Promise<any> {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });

      const response = await api.get(
        `/categories/${id}/transactions?${queryParams.toString()}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch category transactions"
      );
    }
  }

  /**
   * Get categories with transaction counts
   */
  static async getWithTransactionCounts(user_id?: number): Promise<Category[]> {
    try {
      const params = new URLSearchParams();
      params.append("with_counts", "true");
      if (user_id) {
        params.append("user_id", user_id.toString());
      }

      const response = await api.get<{ data: Category[] }>(
        `/categories?${params.toString()}`
      );
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch categories with counts"
      );
    }
  }

  /**
   * Get category summary
   */
  static async getSummary(user_id?: number): Promise<any> {
    try {
      const params = new URLSearchParams();
      params.append("summary", "true");
      if (user_id) {
        params.append("user_id", user_id.toString());
      }

      const response = await api.get(`/categories?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch category summary"
      );
    }
  }

  /**
   * Get categories by type
   */
  static async getByType(user_id?: number): Promise<any> {
    try {
      const params = new URLSearchParams();
      params.append("by_type", "true");
      if (user_id) {
        params.append("user_id", user_id.toString());
      }

      const response = await api.get(`/categories?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch categories by type"
      );
    }
  }

  /**
   * Get category usage report
   */
  static async getUsageReport(
    params: {
      user_id?: number;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<any> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("type", "usage");
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });

      const response = await api.get(
        `/categories/reports?${queryParams.toString()}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch usage report"
      );
    }
  }
}
