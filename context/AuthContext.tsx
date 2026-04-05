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
    Storage.get('last_user', null).then((cached: User | null) => {
      if (cached) setUserState(cached);
      // Mark loaded immediately after storage read — do NOT wait for the server.
      // This means the user is never stuck on a spinner due to network latency.
      setLoaded(true);

      // Server sync runs fully in background after the app is already usable.
      if (cached) {
        fetch(`${API_BASE}/api/user?email=${encodeURIComponent(cached.email)}`)
          .then(r => r.json())
          .then(d => {
            if (d.user) {
              setUserState(prev => {
                if (!prev) return prev;
                const merged = {
                  ...prev,
                  ...d.user,
                  // Never let the server overwrite an active local mining session.
                  // The server may have a stale null if the POST during startMining
                  // didn't reach it, so trust the local value.
                  mineStart: (typeof prev.mineStart === 'number')
                    ? prev.mineStart
                    : d.user.mineStart,
                  boostsLeft: prev.boostsLeft ?? d.user.boostsLeft,
                };
                Storage.set('last_user', merged);
                return merged;
              });
            }
          })
          .catch(() => {}); // silent — cached data is still valid offline
      }
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
