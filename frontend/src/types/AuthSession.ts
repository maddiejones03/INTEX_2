export interface AuthSession {
  isAuthenticated: boolean;
  userId: string | null;
  username: string | null;
  email: string | null;
  /** Set for donor accounts linked to supporters.donor_id */
  supporterId: number | null;
  roles: string[];
}
