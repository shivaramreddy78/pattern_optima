"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient, setAuthToken, getAuthToken } from '@/lib/api';

export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  company_name: string;
  mobile_number?: string;
  profile_image?: string;
  accent_color?: string;
  theme?: string;
  language?: string;
  is_active: boolean;
  created_at: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  signup: (fullName: string, companyName: string, mobileNumber: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<{ reset_url: string; reset_token: string }>;
  resetPassword: (token: string, password: string) => Promise<void>;
  updateProfile: (fullName: string, companyName: string, mobileNumber: string, email: string) => Promise<UserProfile>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initialize and check persistent token session on boot
  useEffect(() => {
    async function initAuth() {
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Verify token with backend
        const res = await apiClient.get('/auth/me');
        setUser(res.data);
        setIsAuthenticated(true);
      } catch (err) {
        console.warn("Invalid or expired session token, logging out...", err);
        setAuthToken(null);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    }
    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<UserProfile> => {
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      const { access_token, user: profile } = res.data;
      setAuthToken(access_token);
      setUser(profile);
      setIsAuthenticated(true);
      setLoading(false);
      return profile;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const signup = async (fullName: string, companyName: string, mobileNumber: string, email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      await apiClient.post('/auth/register', {
        email,
        password,
        full_name: fullName,
        company_name: companyName,
        mobile_number: mobileNumber
      });
      setLoading(false);
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('pattern_optima_token');
  };

  const forgotPassword = async (email: string): Promise<{ reset_url: string; reset_token: string }> => {
    try {
      const res = await apiClient.post('/auth/forgot-password', { email });
      return res.data;
    } catch (err) {
      throw err;
    }
  };

  const resetPassword = async (token: string, password: string): Promise<void> => {
    try {
      await apiClient.post('/auth/reset-password', { token, new_password: password });
    } catch (err) {
      throw err;
    }
  };

  const updateProfile = async (fullName: string, companyName: string, mobileNumber: string, email: string): Promise<UserProfile> => {
    try {
      const res = await apiClient.put('/auth/profile', {
        full_name: fullName,
        company_name: companyName,
        mobile_number: mobileNumber,
        email: email
      });
      setUser(res.data);
      return res.data;
    } catch (err) {
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      loading,
      login,
      signup,
      logout,
      forgotPassword,
      resetPassword,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
