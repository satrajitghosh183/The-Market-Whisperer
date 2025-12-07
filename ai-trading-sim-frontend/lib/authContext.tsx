"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from './api';

interface User {
  _id: string;
  email: string;
  name?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('token');
    if (token) {
      authAPI.getMe()
        .then((data) => {
          console.log('User loaded from token:', data);
          setUser(data);
        })
        .catch((err) => {
          console.error('Failed to load user:', err);
          localStorage.removeItem('token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    console.log('Attempting login...');
    const data = await authAPI.login(email, password);
    console.log('Login response:', data);
    
    // Backend returns { _id, name, email, role, token } directly
    localStorage.setItem('token', data.token);
    setUser({
      _id: data._id,
      email: data.email,
      name: data.name,
      role: data.role,
    });
    
    console.log('Login successful, user set:', data.name);
  };

  const register = async (email: string, password: string, name: string) => {
    console.log('Attempting registration...');
    const data = await authAPI.register(email, password, name);
    console.log('Register response:', data);
    
    // Backend returns { _id, name, email, role, token } directly
    localStorage.setItem('token', data.token);
    setUser({
      _id: data._id,
      email: data.email,
      name: data.name,
      role: data.role,
    });
    
    console.log('Registration successful, user set:', data.name);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
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

