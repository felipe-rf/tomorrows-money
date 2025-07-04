import { api } from "../config";
import { Tag, PaginatedResponse } from "../../types/api";

export interface TagFilters {
  page?: number;
  limit?: number;
  name?: string;
  color?: string;
  popular?: boolean;
  search?: string;
  stats?: boolean;
  user_id?: number;
}

export interface CreateTagData {
  name: string;
  color?: string;
}

export class TagService {
  /**
   * Get all tags
   */
  static async getAll(
    filters: TagFilters = {}
  ): Promise<PaginatedResponse<Tag>> {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });

      const response = await api.get<PaginatedResponse<Tag>>(
        `/tags?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to fetch tags");
    }
  }

  /**
   * Get tag by ID
   */
  static async getById(id: number): Promise<Tag> {
    try {
      const response = await api.get<Tag>(`/tags/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to fetch tag");
    }
  }

  /**
   * Create new tag
   */
  static async create(data: CreateTagData): Promise<Tag> {
    try {
      const response = await api.post<Tag>("/tags", data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to create tag");
    }
  }

  /**
   * Update tag
   */
  static async update(id: number, data: Partial<CreateTagData>): Promise<Tag> {
    try {
      const response = await api.put<Tag>(`/tags/${id}`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to update tag");
    }
  }

  /**
   * Delete tag
   */
  static async delete(id: number): Promise<void> {
    try {
      await api.delete(`/tags/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to delete tag");
    }
  }

  /**
   * Search tags by name
   */
  static async search(searchTerm: string, limit: number = 10): Promise<Tag[]> {
    try {
      const params = new URLSearchParams();
      params.append("search", searchTerm);
      params.append("limit", limit.toString());

      const response = await api.get<{ data: Tag[]; search_term: string }>(
        `/tags?${params.toString()}`
      );
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to search tags");
    }
  }

  /**
   * Get popular tags
   */
  static async getPopular(
    limit: number = 10,
    user_id?: number
  ): Promise<Tag[]> {
    try {
      const params = new URLSearchParams();
      params.append("popular", "true");
      params.append("limit", limit.toString());
      if (user_id) {
        params.append("user_id", user_id.toString());
      }

      const response = await api.get<{ data: Tag[] }>(
        `/tags?${params.toString()}`
      );
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch popular tags"
      );
    }
  }

  /**
   * Get tags with usage statistics
   */
  static async getWithStats(user_id?: number): Promise<Tag[]> {
    try {
      const params = new URLSearchParams();
      params.append("stats", "true");
      if (user_id) {
        params.append("user_id", user_id.toString());
      }

      const response = await api.get<{ data: Tag[] }>(
        `/tags?${params.toString()}`
      );
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch tags with stats"
      );
    }
  }

  /**
   * Get tag statistics
   */
  static async getStats(id: number, user_id?: number): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (user_id) {
        params.append("user_id", user_id.toString());
      }

      const response = await api.get(`/tags/${id}/stats?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch tag statistics"
      );
    }
  }

  /**
   * Get transactions for a specific tag
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
        `/tags/${id}/transactions?${queryParams.toString()}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch tag transactions"
      );
    }
  }
}
