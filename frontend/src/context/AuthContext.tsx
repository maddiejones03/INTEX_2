import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock admin user for demo
const MOCK_USERS: Array<User & { password: string }> = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123',
    email: 'admin@kanlungan.org',
    role: 'admin',
    firstName: 'Maria',
    lastName: 'Santos',
  },
  {
    id: 2,
    username: 'staff',
    password: 'staff123',
    email: 'staff@kanlungan.org',
    role: 'staff',
    firstName: 'Jose',
    lastName: 'Reyes',
  },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('kanlungan_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('kanlungan_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    const found = MOCK_USERS.find(
      (u) => u.username === username && u.password === password
    );
    if (found) {
      const { password: _p, ...userWithoutPassword } = found;
      setUser(userWithoutPassword);
      localStorage.setItem('kanlungan_user', JSON.stringify(userWithoutPassword));
      setIsLoading(false);
      return { success: true };
    }
    setIsLoading(false);
    return { success: false, error: 'Invalid username or password.' };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('kanlungan_user');
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, logout }}
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
