import type { AIAuthStatus } from '@/types/ai';

const fallbackStatus: AIAuthStatus = {
  state: 'unauthenticated',
  detail: 'AI auth not configured',
  lastUpdated: Date.now(),
};

export async function getAuthStatus(): Promise<AIAuthStatus> {
  if (typeof window === 'undefined' || !window.electronAPI?.aiAuth) {
    return fallbackStatus;
  }

  return window.electronAPI.aiAuth.status();
}

export async function startAuth(payload?: { token?: string }): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === 'undefined' || !window.electronAPI?.aiAuth) {
    return { ok: false, error: 'AI auth not available' };
  }

  return window.electronAPI.aiAuth.start(payload || {});
}

export async function logout(): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === 'undefined' || !window.electronAPI?.aiAuth) {
    return { ok: false, error: 'AI auth not available' };
  }

  return window.electronAPI.aiAuth.logout();
}
