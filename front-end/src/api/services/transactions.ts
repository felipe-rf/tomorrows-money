import { api } from "../config";
import { Transaction, PaginatedResponse } from "../../types/api";

export interface TransactionFilters {
  page?: number;
  limit?: number;
  type?: "income" | "expense";
  category_id?: number;
  startDate?: string;
  endDate?: string;
  summary?: boolean;
}

export interface CreateTransactionData {
  amount: number;
  type: "income" | "expense";
  description: string;
  date?: string;
  category_id?: number;
  tags?: number[];
}

export class TransactionService {
  /**
   * Get all transactions
   */
  static async getAll(
    filters: TransactionFilters = {}
  ): Promise<PaginatedResponse<Transaction>> {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });

      const response = await api.get<PaginatedResponse<Transaction>>(
        `/transactions?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch transactions"
      );
    }
  }

  /**
   * Get transaction by ID
   */
  static async getById(id: number): Promise<Transaction> {
    try {
      const response = await api.get<Transaction>(`/transactions/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch transaction"
      );
    }
  }

  /**
   * Create new transaction
   */
  static async create(data: CreateTransactionData): Promise<Transaction> {
    try {
      const response = await api.post<Transaction>("/transactions", data);
      console.log("Transaction created:", response.data);
      console.log("Transaction created:", data);

      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to create transaction"
      );
    }
  }

  /**
   * Update transaction
   */
  static async update(
    id: number,
    data: Partial<CreateTransactionData>
  ): Promise<Transaction> {
    try {
      const response = await api.put<Transaction>(`/transactions/${id}`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to update transaction"
      );
    }
  }

  /**
   * Delete transaction
   */
  static async delete(id: number): Promise<void> {
    try {
      await api.delete(`/transactions/${id}`);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to delete transaction"
      );
    }
  }
}
