export async function refreshAuthToken(): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === 'undefined' || !window.electronAPI?.aiAuth) {
    return { ok: false, error: 'AI auth not available' };
  }

  return window.electronAPI.aiAuth.refresh();
}
