import React, { createContext, useContext, useState, useEffect } from 'react';
import { Storage } from '../utils/storage';

interface User {
  id: string;
  name: string;
  email: string;
  pass?: string;
  pts: number;
  tokens: number;
  joined: string;
  country: string;
  isAdmin: boolean;
  active: boolean;
  role: string;
  refCode?: string;
  walletAddress?: string;
  spinsLeft?: number;
  mineStart?: number;
  boostsLeft?: number;
  tasksDone?: Record<string, boolean>;
}

interface AuthContextType {
  user: User | null;
  setUser: (u: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  updateUser: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);

  useEffect(() => {
    Storage.get('last_user', null).then((u) => {
      if (u) setUserState(u);
    });
  }, []);

  const setUser = (u: User | null) => {
    setUserState(u);
    if (u) Storage.set('last_user', u);
    else Storage.remove('last_user');
  };

  const updateUser = (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export type { User };
