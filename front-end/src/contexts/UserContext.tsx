import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { User, AuthService, UserService } from "../api";

interface UserContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  deleteUser: (userId?: number) => Promise<void>;
  checkAuthStatus: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Start with false for faster initial render

  // Computed value for authentication status
  const isAuthenticated = !!user && !!token;

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Also check auth when storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      checkAuthStatus();
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  /**
   * Check authentication status from localStorage
   */
  const checkAuthStatus = () => {
    const savedToken = AuthService.getToken();
    const savedUser = AuthService.getCurrentUser();

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(savedUser);
    } else {
      setToken(null);
      setUser(null);
    }
  };

  /**
   * Login user
   */
  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await AuthService.login({ email, password });
      setToken(response.token);
      setUser(response.user);
    } catch (error) {
      setToken(null);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Register new user
   */
  const register = async (
    name: string,
    email: string,
    password: string
  ): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await AuthService.register({ name, email, password });
      setToken(response.token);
      setUser(response.user);
    } catch (error) {
      setToken(null);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout user
   */
  const logout = (): void => {
    AuthService.logout();
    setToken(null);
    setUser(null);
  };

  /**
   * Update user data
   */
  const updateUser = (userData: Partial<User>): void => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }
  };

  /**
   * Delete user account
   */
  const deleteUser = async (userId?: number): Promise<void> => {
    setIsLoading(true);
    try {
      const targetUserId = userId || user?.id;

      if (!targetUserId) {
        throw new Error("No user ID provided for deletion");
      }

      if (!userId || userId === user?.id) {
        await UserService.deleteSelf();
        logout();
      } else {
        await UserService.delete(targetUserId);
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue: UserContextType = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
    deleteUser,
    checkAuthStatus,
  };

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  );
}

/**
 * Custom hook to use the user context
 * Throws an error if used outside of UserProvider
 */
export function useUser(): UserContextType {
  const context = useContext(UserContext);

  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }

  return context;
}

/**
 * Custom hook for authentication checks
 */
export function useAuth() {
  const { isAuthenticated, user, token, login, register, logout } = useUser();

  return {
    isAuthenticated,
    user,
    token,
    login,
    register,
    logout,
  };
}

/**
 * Higher-order component for protected routes
 */
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useUser();

    if (isLoading) {
      return <div>Loading...</div>; // You can replace with a proper loading component
    }

    if (!isAuthenticated) {
      // Redirect to login or show unauthorized message
      return null;
    }
    return <Component {...props} />;
  };
}

export default UserContext;
