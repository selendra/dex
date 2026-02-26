'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/types/auth';
import { api } from '@/lib/api';
import { storage } from '@/lib/storage';
import { isTokenExpired } from '@orange-wallet/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  setAuthToken: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      const savedToken = storage.getToken();

      if (savedToken) {
        // Check if token is expired
        if (isTokenExpired(savedToken)) {
          storage.clearAuth();
          setIsLoading(false);
          return;
        }

        try {
          const response = await api.getUserProfile(savedToken);
          setUser(response.user);
          setToken(savedToken);
        } catch (error) {
          // Only clear auth on 401 errors, not network errors
          if (error instanceof Error && error.message.includes('401')) {
            storage.clearAuth();
          } else {
            // Network error - keep the token, user might be offline
            setToken(savedToken);
          }
        }
      }

      setIsLoading(false);
    };

    loadUser();
  }, []);

  const login = useCallback(() => {
    // Navigate to backend's authorize endpoint which sets an origin cookie
    // then redirects to the OAuth provider. On callback, the backend reads
    // the cookie and redirects back to this app's origin.
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
    const origin = encodeURIComponent(window.location.origin);
    window.location.href = `${apiBase}/api/oauth/authorize?origin=${origin}`;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    storage.clearAuth();
    router.push('/');
  }, [router]);

  const setAuthToken = useCallback(
    async (newToken: string) => {
      storage.setToken(newToken);
      const response = await api.getUserProfile(newToken);
      setUser(response.user);
      setToken(newToken);
    },
    []
  );

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    login,
    logout,
    setAuthToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
