import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, AuthResponse, clearToken, saveToken, User } from './api';

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (r: AuthResponse) => void;
  updateUser: (u: User) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On page load: if a token is saved, ask the backend who we are.
  useEffect(() => {
    if (!localStorage.getItem('komek_token')) {
      setLoading(false);
      return;
    }
    api.me()
      .then(setUser)
      .catch(clearToken)
      .finally(() => setLoading(false));
  }, []);

  const signIn = (r: AuthResponse) => {
    saveToken(r.token);
    setUser(r.user);
  };

  const signOut = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, updateUser: setUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
