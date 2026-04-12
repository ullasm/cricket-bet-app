import { abbreviateTeam, parseTeamNames } from './teamUtils';
import { Timestamp } from 'firebase/firestore';
import type { MasterMatch } from './masterMatches';
import { deriveStatus, parseResultFromStatus } from './masterMatches';

const API_KEY = process.env.NEXT_PUBLIC_CRICAPI_KEY ?? '';

// ── Raw CricAPI series_info shape ─────────────────────────────────────────────

interface CricApiSeriesMatch {
  id: string;
  name: string;
  matchType: string;
  status: string;
  venue: string;
  date: string;
  dateTimeGMT?: string;
  dateTimeLocal?: string;
  teams: string[];
  matchStarted?: boolean;
  matchEnded?: boolean;
}

export interface SeriesInfoRaw {
  status: string;
  data?: {
    id: string;
    name: string;
    info?: Record<string, unknown>;
    matchList?: CricApiSeriesMatch[];
  };
}

// ── Raw CricAPI match_info shape ──────────────────────────────────────────────

interface MatchInfoRaw {
  status: string;
  data?: {
    id: string;
    name: string;
    status: string;
    matchStarted?: boolean;
    matchEnded?: boolean;
    teams: string[];
    date: string;
    dateTimeLocal?: string;
  };
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

export async function fetchSeriesInfo(cricapiId: string): Promise<SeriesInfoRaw> {
  const res = await fetch(
    `https://api.cricapi.com/v1/series_info?apikey=${API_KEY}&id=${cricapiId}`,
    { cache: 'no-store' }
  );
  if (!res.ok) throw new Error(`CricAPI series_info failed: ${res.status}`);
  return res.json();
}

export async function fetchMatchInfo(matchId: string): Promise<MatchInfoRaw> {
  const res = await fetch(
    `https://api.cricapi.com/v1/match_info?apikey=${API_KEY}&id=${matchId}`,
    { cache: 'no-store' }
  );
  if (!res.ok) throw new Error(`CricAPI match_info failed: ${res.status}`);
  return res.json();
}

// ── Parsers ───────────────────────────────────────────────────────────────────

export function parseSeriesInfoToMatches(
  raw: SeriesInfoRaw,
  cricapiId: string,
  seriesName: string
): Omit<MasterMatch, 'id'>[] {
  const matchList = raw.data?.matchList ?? [];

  return matchList.map((m) => {
    const { teamA, teamB } = parseTeamNames(m.name);
    const teamAShort = abbreviateTeam(teamA);
    const teamBShort = abbreviateTeam(teamB);

    const matchStarted = m.matchStarted ?? false;
    const matchEnded = m.matchEnded ?? false;

    const rawResult = parseResultFromStatus(m.status, teamA, teamAShort, teamB, teamBShort);
    const status = deriveStatus(matchStarted, matchEnded, rawResult);
    const result = matchEnded ? rawResult : 'pending';

    // Prefer dateTimeGMT (UTC), then dateTimeLocal, then date-only
    const dateStr = m.dateTimeGMT
      ? m.dateTimeGMT.endsWith('Z') ? m.dateTimeGMT : m.dateTimeGMT + 'Z'
      : m.dateTimeLocal || m.date;
    const startsAt = dateStr
      ? Timestamp.fromDate(new Date(dateStr))
      : Timestamp.now();

    return {
      source: 'cricapi' as const,
      sourceApiId: cricapiId,
      sourceMatchId: m.id,
      seriesName,
      teamA,
      teamAShort,
      teamB,
      teamBShort,
      startsAt,
      matchStarted,
      matchEnded,
      status,
      result,
    };
  });
}

export function parseMatchInfoUpdate(
  raw: MatchInfoRaw,
  existing: Pick<MasterMatch, 'teamA' | 'teamAShort' | 'teamB' | 'teamBShort'>
): Pick<MasterMatch, 'matchStarted' | 'matchEnded' | 'status' | 'result'> {
  const data = raw.data;
  if (!data) return { matchStarted: false, matchEnded: false, status: 'upcoming', result: 'pending' };

  const matchStarted = data.matchStarted ?? false;
  const matchEnded = data.matchEnded ?? false;

  const rawResult = parseResultFromStatus(
    data.status,
    existing.teamA,
    existing.teamAShort,
    existing.teamB,
    existing.teamBShort
  );
  const status = deriveStatus(matchStarted, matchEnded, rawResult);
  const result = matchEnded ? rawResult : 'pending';

  return { matchStarted, matchEnded, status, result };
}
