import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { getAuthSession } from '../services/authApi';
import type { AuthSession } from '../types/AuthSession';

const anonymousSession: AuthSession = {
  isAuthenticated: false,
  username: null,
  email: null,
  roles: [],
};

interface AuthContextType {
  authSession: AuthSession;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshAuthSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authSession, setAuthSession] = useState<AuthSession>(anonymousSession);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuthSession = useCallback(async () => {
    try {
      const session = await getAuthSession();
      setAuthSession(session);
    } catch {
      setAuthSession(anonymousSession);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuthSession();
  }, [refreshAuthSession]);

  return (
    <AuthContext.Provider
      value={{
        authSession,
        isAuthenticated: authSession.isAuthenticated,
        isLoading,
        refreshAuthSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
