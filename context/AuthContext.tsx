import React, { createContext, useContext, useState, useEffect } from 'react';
import { Storage } from '../utils/storage';
import { API_BASE } from '../constants';

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
  loaded: boolean;
  setUser: (u: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loaded: false,
  setUser: () => {},
  updateUser: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Storage.get('last_user', null).then(async (cached: User | null) => {
      if (cached) {
        // Immediately set cached user so the app feels instant
        setUserState(cached);
        // Fetch fresh data from server in background to sync latest pts/tokens/etc
        try {
          const r = await fetch(`${API_BASE}/api/user?email=${encodeURIComponent(cached.email)}`);
          const d = await r.json();
          if (d.user) {
            const merged = { ...cached, ...d.user };
            setUserState(merged);
            Storage.set('last_user', merged);
          }
        } catch {
          // Network unavailable — cached data is still usable
        }
      }
      setLoaded(true);
    });
  }, []);

  const setUser = (u: User | null) => {
    setUserState(u);
    if (u) Storage.set('last_user', u);
    else Storage.remove('last_user');
  };

  const updateUser = (updates: Partial<User>) => {
    setUserState(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      Storage.set('last_user', updated);
      return updated;
    });
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loaded, setUser, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export type { User };
