/**
 * Centralized API client for communicating with the CreatorPilot backend.
 *
 * In development, Next.js rewrites proxy /api/* → http://localhost:8000/api/*,
 * so we can use relative URLs. For direct connections (e.g. SSE / EventSource),
 * we fall back to NEXT_PUBLIC_API_URL or localhost:8000.
 */

const API_BASE_URL =
  typeof window !== 'undefined'
    ? window.location.origin  // Same-origin in browser (goes through Next.js proxy)
    : 'http://localhost:8000';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || API_BASE_URL;

/**
 * Fetch JSON from the backend. Returns null on failure (caller decides fallback).
 */
export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, init);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`API ${init?.method ?? 'GET'} ${path} → ${res.status}: ${text}`);
      return null;
    }
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Build a full API URL (useful for EventSource / direct downloads where
 * relative URLs won't work).
 */
export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}
