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
  userId: null,
  username: null,
  email: null,
  supporterId: null,
  roles: [],
};

interface AuthContextType {
  authSession: AuthSession;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshAuthSession: () => Promise<AuthSession>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authSession, setAuthSession] = useState<AuthSession>(anonymousSession);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuthSession = useCallback(async (): Promise<AuthSession> => {
    try {
      const session = await getAuthSession();
      const merged: AuthSession = {
        ...anonymousSession,
        ...session,
        roles: session.roles ?? [],
        userId: session.userId ?? null,
        supporterId: session.supporterId ?? null,
      };
      setAuthSession(merged);
      return merged;
    } catch {
      setAuthSession(anonymousSession);
      return anonymousSession;
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
