import type { PlayableWorkerId } from './types';

export interface LeaderboardEntry {
  id: number;
  initials: string;
  score: number;
  cashWon: number;
  grade: string;
  jugsCollected: number;
  brawlsWon: number;
  worker: PlayableWorkerId;
  createdAt: string;
}

export interface SubmitScorePayload {
  initials: string;
  score: number;
  cashWon: number;
  grade: string;
  jugsCollected: number;
  brawlsWon: number;
  worker: PlayableWorkerId;
}

export interface SubmitScoreResponse {
  entry: LeaderboardEntry;
  rank: number;
  entries: LeaderboardEntry[];
}

const INITIALS_KEY = 'celina52_initials_v1';
const PROD_API_URL = 'https://celina52-piss-jug-patrol.pages.dev/api/leaderboard';

function getApiEndpoints(): string[] {
  if (typeof window === 'undefined') return ['/api/leaderboard'];
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return ['/api/leaderboard', PROD_API_URL];
  }
  return ['/api/leaderboard'];
}

export function sanitizeInitials(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 3);
}

export function loadSavedInitials(): string {
  try {
    return sanitizeInitials(localStorage.getItem(INITIALS_KEY) ?? '');
  } catch {
    return '';
  }
}

export function saveLastInitials(initials: string): void {
  try {
    const clean = sanitizeInitials(initials);
    if (clean.length === 3) {
      localStorage.setItem(INITIALS_KEY, clean);
    }
  } catch {
    // Ignore storage errors in private browsing
  }
}

export async function fetchGlobalLeaderboard(): Promise<LeaderboardEntry[]> {
  let lastError: Error | null = null;
  for (const url of getApiEndpoints()) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        throw new Error('Non-JSON response');
      }
      const data = (await res.json()) as { entries?: LeaderboardEntry[] };
      if (Array.isArray(data.entries)) {
        return data.entries;
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError ?? new Error('Unable to load global leaderboard');
}

export async function submitGlobalScore(payload: SubmitScorePayload): Promise<SubmitScoreResponse> {
  const cleanInitials = sanitizeInitials(payload.initials);
  if (cleanInitials.length !== 3) {
    throw new Error('Enter exactly 3 letters or numbers for your initials.');
  }

  let lastError: Error | null = null;
  for (const url of getApiEndpoints()) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          ...payload,
          initials: cleanInitials,
        }),
      });
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as Partial<SubmitScoreResponse> & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      if (data.entry && Array.isArray(data.entries)) {
        saveLastInitials(cleanInitials);
        return {
          entry: data.entry,
          rank: Number(data.rank ?? 1),
          entries: data.entries,
        };
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError ?? new Error('Unable to save score to global leaderboard');
}
