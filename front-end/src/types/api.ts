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
  description?: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
  priority: "low" | "medium" | "high";
  is_completed: boolean;
  user_id: number;
  category_id?: number;
  progress_percentage: number;
  remaining_amount: number;
  days_remaining?: number;
  created_at: string;
  updated_at: string;
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
