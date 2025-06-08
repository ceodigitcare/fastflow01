import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { Business } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  loginUser as loginUserApi, 
  logoutUser as logoutUserApi, 
  registerUser as registerUserApi 
} from "@/lib/auth";
import { useLocation } from "wouter";

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  name: string;
  username: string;
  email: string;
  password: string;
};

// Create a fresh context with complete type definitions
interface AuthContextType {
  user: Business | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<any, Error, LoginData>;
  logoutMutation: UseMutationResult<any, Error, void>;
  registerMutation: UseMutationResult<any, Error, RegisterData>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Store the User query result
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<Business | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await loginUserApi(credentials);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Login successful",
        description: "Welcome back to StoreFront!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await logoutUserApi();
    },
    onSuccess: () => {
      // Clear all query data immediately
      queryClient.clear();
      
      // Set user data to null explicitly
      queryClient.setQueryData(["/api/auth/me"], null);
      
      // Clear any localStorage/sessionStorage auth data
      localStorage.clear();
      sessionStorage.clear();
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      const res = await registerUserApi(credentials);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Registration successful",
        description: "Your account has been created successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "Username may already be taken",
        variant: "destructive",
      });
    },
  });

  // Helper function to handle logout and redirect
  const logout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        // Force immediate redirect to auth page
        window.location.href = '/auth';
      },
      onError: () => {
        // Even if logout fails, clear local state and redirect
        queryClient.clear();
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/auth';
      }
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error: error as Error | null,
        loginMutation,
        logoutMutation,
        registerMutation,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}