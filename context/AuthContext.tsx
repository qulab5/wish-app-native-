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

  // ── Step 1: Read from storage on startup ──────────────────────────────────
  useEffect(() => {
    Storage.get('last_user', null).then((cached: User | null) => {
      if (cached) setUserState(cached);
      setLoaded(true);

      // Server sync in background — never blocks the UI
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
                  // Preserve active mining session — server may have stale null
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

  // ── Step 2: Persist to storage whenever user changes ─────────────────────
  // IMPORTANT: guard with `loaded` so this does NOT run on initial mount
  // when user=null. Without the guard it would wipe storage before Step 1
  // has a chance to read it, logging the user out on every app open.
  useEffect(() => {
    if (!loaded) return;
    if (user) {
      Storage.set('last_user', user);
    } else {
      Storage.remove('last_user');
    }
  }, [user, loaded]);

  // Pure setter — no Storage calls here, handled by the effect above
  const setUser = (u: User | null) => {
    setUserState(u);
  };

  // Pure updater — no async side effects inside the state updater
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
