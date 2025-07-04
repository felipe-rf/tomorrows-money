export interface User {
  id: number;
  name: string;
  email: string;
  type: string;
  active: boolean;
  viewable_user_id?: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  amount: number;
  type: "income" | "expense";
  description: string;
  date: string;
  user_id: number;
  category_id?: number;
  category?: Category;
  tags?: Tag[];
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  color?: string;
  icon?: string;
  user_id: number;
  transaction_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: number;
  name: string;
  color?: string;
  user_id: number;
  usage_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  category_id?: number;
  description?: string;
  color: string;
  icon?: string;
  priority: "low" | "medium" | "high";
  auto_deduct: boolean;
  is_completed: boolean;
  user_id: number;
  created_at: string;
  updated_at: string;
  // Relations
  user?: {
    id: number;
    name: string;
    email: string;
  };
  category?: {
    id: number;
    name: string;
    color: string;
    icon?: string;
  };
  // Calculated fields
  progress_percentage?: number;
  remaining_amount?: number;
  days_remaining?: number;
  is_overdue?: boolean;
  required_daily_savings?: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  totalPages: number;
  data: T[];
}

export interface ApiError {
  error: string;
  details?: string;
}
