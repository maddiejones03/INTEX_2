import type { AuthSession } from '../types/AuthSession';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5030';

async function readApiError(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text || 'An error occurred';
  } catch {
    return 'An error occurred';
  }
}

export async function getAuthSession(): Promise<AuthSession> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(await readApiError(response));
  }
  return response.json();
}

export async function loginUser(
  email: string,
  password: string,
  rememberMe: boolean = false
): Promise<void> {
  const searchParams = new URLSearchParams();
  if (rememberMe) {
    searchParams.set('useCookies', 'true');
  } else {
    searchParams.set('useSessionCookies', 'true');
  }

  const response = await fetch(
    `${API_BASE_URL}/api/auth/login?${searchParams.toString()}`,
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
