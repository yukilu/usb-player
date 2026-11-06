import type { BrowsePayload, LibraryPayload, PlayerInfo, RootsPayload } from './types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch {
    throw new Error('连不上本地后台，请确认 npm run dev 正在运行');
  }

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (data as { error?: string } | null)?.error;
    throw new Error(message || `请求失败（HTTP ${response.status}）`);
  }
  return data as T;
}

export const api = {
  health: () => request<{
    ok: boolean;
    platform: string;
    version: string;
    videoExts: string[];
    imageExts: string[];
  }>('/health'),

  roots: () => request<RootsPayload>('/fs/roots'),

  browse: (target: string | null) =>
    request<BrowsePayload>(`/fs/browse?path=${encodeURIComponent(target ?? '')}`),

  pick: () =>
    request<{ path: string | null; canceled: boolean }>('/fs/pick', { method: 'POST' }),

  open: (target: string, recursive: boolean) =>
    request<LibraryPayload>('/library/open', {
      method: 'POST',
      body: JSON.stringify({ path: target, recursive }),
    }),

  detectPlayer: (refresh = false) =>
    request<PlayerInfo>(`/player/detect${refresh ? '?refresh=1' : ''}`),

  validatePlayer: (target: string) =>
    request<{ valid: boolean }>('/player/validate', {
      method: 'POST',
      body: JSON.stringify({ path: target }),
    }),

  play: (id: string, playerPath?: string) =>
    request<{ ok: boolean; player: string; file: string }>('/player/play', {
      method: 'POST',
      body: JSON.stringify({ id, playerPath }),
    }),

  reveal: (id: string) =>
    request<{ ok: boolean }>('/player/reveal', {
      method: 'POST',
      body: JSON.stringify({ id }),
    }),
};
