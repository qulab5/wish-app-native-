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

  // Persist user to AsyncStorage on every change.
  // This is the ONLY place we write to storage — no side effects in state updaters.
  useEffect(() => {
    if (user) {
      Storage.set('last_user', user);
    } else {
      Storage.remove('last_user');
    }
  }, [user]);

  // Load user from storage on startup, then sync fresh data from server in background.
  useEffect(() => {
    Storage.get('last_user', null).then((cached: User | null) => {
      if (cached) setUserState(cached);
      setLoaded(true);

      if (cached) {
        fetch(`${API_BASE}/api/user?email=${encodeURIComponent(cached.email)}`)
          .then(r => r.json())
          .then(d => {
            if (d.user) {
              setUserState(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  ...d.user,
                  // Never let the server overwrite an active local mining session
                  mineStart: (typeof prev.mineStart === 'number')
                    ? prev.mineStart
                    : d.user.mineStart,
                  boostsLeft: prev.boostsLeft ?? d.user.boostsLeft,
                };
              });
            }
          })
          .catch(() => {});
      }
    });
  }, []);

  // Pure state setter — storage is handled by the useEffect above
  const setUser = (u: User | null) => {
    setUserState(u);
  };

  // Pure updater — no async side effects, no Storage calls
  const updateUser = (updates: Partial<User>) => {
    setUserState(prev => {
      if (!prev) return prev;
      return { ...prev, ...updates };
    });
  };

  const logout = () => {
    setUserState(null);
  };

  return (
    <AuthContext.Provider value={{ user, loaded, setUser, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export type { User };
