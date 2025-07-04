import { api } from "../config";
import { PaginatedResponse } from "../../types/api";

export interface Log {
  log_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_value?: any;
  new_value?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface LogFilters {
  page?: number;
  limit?: number;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
  startDate?: string;
  endDate?: string;
  ip_address?: string;
  summary?: boolean;
  activity?: boolean;
  search?: string;
}

export interface CreateLogData {
  action: string;
  entity_type: string;
  entity_id?: string;
  old_value?: any;
  new_value?: any;
  target_user_id?: string;
}

export interface LogSummary {
  overview: {
    total_logs: number;
    recent_activity_24h: number;
  };
  by_action: Array<{
    _id: string;
    count: number;
  }>;
  by_entity_type: Array<{
    _id: string;
    count: number;
  }>;
  period: {
    start_date: string | null;
    end_date: string | null;
  };
}

export interface LogActivity {
  period: {
    hours_back: number;
    from: string;
    to: string;
  };
  hourly_activity: Array<{
    _id: {
      hour: number;
      date: string;
    };
    count: number;
  }>;
  recent_logs: Log[];
}

export interface EntityLogs {
  entity: {
    type: string;
    id: string;
  };
  total: number;
  page: number;
  totalPages: number;
  data: Log[];
}

export class LogService {
  /**
   * Get all logs with optional filtering
   */
  static async getAll(
    filters: LogFilters = {}
  ): Promise<PaginatedResponse<Log>> {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });

      const response = await api.get<PaginatedResponse<Log>>(
        `/logs?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to fetch logs");
    }
  }

  /**
   * Get log by ID
   */
  static async getById(logId: string): Promise<Log> {
    try {
      const response = await api.get<Log>(`/logs/${logId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to fetch log");
    }
  }

  /**
   * Create new log entry
   * Note: Usually logs are created automatically by middleware
   */
  static async create(data: CreateLogData): Promise<Log> {
    try {
      const response = await api.post<Log>("/logs", data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to create log");
    }
  }

  /**
   * Update log (usually not allowed)
   */
  static async update(
    logId: string,
    data: Partial<CreateLogData>
  ): Promise<Log> {
    try {
      const response = await api.put<Log>(`/logs/${logId}`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to update log");
    }
  }

  /**
   * Delete log (admin only)
   */
  static async delete(logId: string): Promise<void> {
    try {
      await api.delete(`/logs/${logId}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to delete log");
    }
  }

  /**
   * Get logs summary with statistics
   */
  static async getSummary(
    filters: Omit<LogFilters, "summary"> = {}
  ): Promise<LogSummary> {
    try {
      const params = new URLSearchParams({ summary: "true" });
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });

      const response = await api.get<LogSummary>(`/logs?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch logs summary"
      );
    }
  }

  /**
   * Get activity logs for recent period
   */
  static async getActivity(
    filters: Omit<LogFilters, "activity"> & { hours?: number } = {}
  ): Promise<LogActivity> {
    try {
      const params = new URLSearchParams({ activity: "true" });
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });

      const response = await api.get<LogActivity>(`/logs?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch activity logs"
      );
    }
  }

  /**
   * Search logs by term
   */
  static async search(
    searchTerm: string,
    limit: number = 50
  ): Promise<{ data: Log[]; search_term: string }> {
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        limit: limit.toString(),
      });

      const response = await api.get<{ data: Log[]; search_term: string }>(
        `/logs?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to search logs");
    }
  }

  /**
   * Get logs for a specific entity
   */
  static async getByEntity(
    entityType: string,
    entityId: string,
    filters: { page?: number; limit?: number } = {}
  ): Promise<EntityLogs> {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });

      const queryString = params.toString();
      const url = `/logs/entity/${entityType}/${entityId}${
        queryString ? `?${queryString}` : ""
      }`;

      const response = await api.get<EntityLogs>(url);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch entity logs"
      );
    }
  }

  /**
   * Get action type label for display
   */
  static getActionLabel(action: string): string {
    const actionLabels: Record<string, string> = {
      create: "Created",
      update: "Updated",
      delete: "Deleted",
      read: "Viewed",
      login: "Logged In",
      logout: "Logged Out",
      register: "Registered",
      activate: "Activated",
      deactivate: "Deactivated",
      export: "Exported",
      import: "Imported",
    };

    return actionLabels[action.toLowerCase()] || action;
  }

  /**
   * Get entity type label for display
   */
  static getEntityTypeLabel(entityType: string): string {
    const entityLabels: Record<string, string> = {
      user: "User",
      transaction: "Transaction",
      category: "Category",
      tag: "Tag",
      goal: "Goal",
      auth: "Authentication",
      system: "System",
    };

    return entityLabels[entityType.toLowerCase()] || entityType;
  }

  /**
   * Get action color for UI display
   */
  static getActionColor(action: string): string {
    const actionColors: Record<string, string> = {
      create: "green",
      update: "blue",
      delete: "red",
      read: "gray",
      login: "teal",
      logout: "orange",
      register: "violet",
      activate: "lime",
      deactivate: "yellow",
      export: "cyan",
      import: "indigo",
    };

    return actionColors[action.toLowerCase()] || "gray";
  }

  /**
   * Format log timestamp for display
   */
  static formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    } else if (diffMins > 0) {
      return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    } else {
      return "Just now";
    }
  }

  /**
   * Format log description for display
   */
  static formatLogDescription(log: Log): string {
    const action = this.getActionLabel(log.action);
    const entityType = this.getEntityTypeLabel(log.entity_type);
    const userName = log.user?.name || "Unknown User";

    if (log.entity_id) {
      return `${userName} ${action.toLowerCase()} ${entityType.toLowerCase()} #${
        log.entity_id
      }`;
    } else {
      return `${userName} ${action.toLowerCase()} ${entityType.toLowerCase()}`;
    }
  }

  /**
   * Check if user can view logs
   */
  static canViewLogs(userType: number): boolean {
    return userType === 1; // Only admins can view logs
  }

  /**
   * Check if user can delete logs
   */
  static canDeleteLogs(userType: number): boolean {
    return userType === 1; // Only admins can delete logs
  }
}
