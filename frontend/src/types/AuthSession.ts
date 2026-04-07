export interface AuthSession {
  isAuthenticated: boolean;
  username: string | null;
  email: string | null;
  roles: string[];
}
