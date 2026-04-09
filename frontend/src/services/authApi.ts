import type { AuthSession } from '../types/AuthSession';

/** Same-origin /api in dev (Vite proxy), or VITE_API_BASE_URL in production. */
export function getApiBaseUrl(): string {
  return (
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.DEV ? '' : 'http://localhost:5030')
  );
}

const API_BASE_URL = getApiBaseUrl();

async function readApiError(response: Response): Promise<string> {
  try {
    const text = await response.text();
    if (!text) return 'An error occurred';
    try {
      const body = JSON.parse(text) as { error?: string; title?: string };
      if (typeof body.error === 'string') return body.error;
      if (typeof body.title === 'string') return body.title;
    } catch {
      /* not JSON */
    }
    return text;
  } catch {
    return 'An error occurred';
  }
}

/** Identity role names; must match backend AuthRoles. */
export type AuthPortal = 'Admin' | 'CaseManager' | 'Donor';

export async function getAuthSession(): Promise<AuthSession> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(await readApiError(response));
  }
  return response.json();
}

function cookieQueryString(rememberMe: boolean): string {
  const searchParams = new URLSearchParams();
  if (rememberMe) {
    searchParams.set('useCookies', 'true');
  } else {
    searchParams.set('useSessionCookies', 'true');
  }
  return searchParams.toString();
}

export async function loginUser(
  email: string,
  password: string,
  rememberMe: boolean = false
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/login?${cookieQueryString(rememberMe)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    }
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }
}

export async function signInWithPortal(
  email: string,
  password: string,
  portal: AuthPortal,
  rememberMe: boolean = false
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/sign-in?${cookieQueryString(rememberMe)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, portal }),
      credentials: 'include',
    }
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }
}

export async function registerUser(
  email: string,
  password: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }
}

export async function logoutUser(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }
}
