export interface CricMatch {
  id: string;
  name: string;
  teams: string[];
  date: string;
  dateTimeLocal: string;
  matchType: string;
  status: string;
  venue: string;
  score: string | null;
  isLive: boolean;
}

const API_KEY = process.env.NEXT_PUBLIC_CRICAPI_KEY ?? '';

function buildScore(scoreArr: Array<{ r?: number; w?: number; o?: number; inning?: string }> | undefined): string | null {
  if (!scoreArr || scoreArr.length === 0) return null;
  return scoreArr
    .map((s) => {
      const inning = s.inning ?? '';
      const runs = s.r != null ? s.r : '-';
      const wkts = s.w != null ? `/${s.w}` : '';
      const overs = s.o != null ? ` (${s.o} ov)` : '';
      return `${inning}: ${runs}${wkts}${overs}`;
    })
    .join(' | ');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalise(raw: any, isLive: boolean): CricMatch {
  return {
    id: raw.id ?? raw.unique_id ?? '',
    name: raw.name ?? '',
    teams: Array.isArray(raw.teams) ? raw.teams : [],
    date: raw.date ?? '',
    dateTimeLocal: raw.dateTimeLocal ?? raw.date ?? '',
    matchType: (raw.matchType ?? raw.match_type ?? '').toLowerCase(),
    status: raw.status ?? '',
    venue: raw.venue ?? '',
    score: buildScore(raw.score),
    isLive,
  };
}

export async function GET() {
  if (!API_KEY) {
    return Response.json({ matches: [], debug: { currentMatches: 0, matches0: 0, matches25: 0, matches50: 0, total: 0 } });
  }

  try {
    const [liveRes, upcomingRes, upcomingRes2, upcomingRes3] = await Promise.all([
      fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${API_KEY}&offset=0`, { cache: 'no-store' }),
      fetch(`https://api.cricapi.com/v1/matches?apikey=${API_KEY}&offset=0`, { cache: 'no-store' }),
      fetch(`https://api.cricapi.com/v1/matches?apikey=${API_KEY}&offset=25`, { cache: 'no-store' }),
      fetch(`https://api.cricapi.com/v1/matches?apikey=${API_KEY}&offset=50`, { cache: 'no-store' }),
    ]);

    const [liveJson, upcomingJson, upcomingJson2, upcomingJson3] = await Promise.all([
      liveRes.ok ? liveRes.json() : Promise.resolve({ data: [] }),
      upcomingRes.ok ? upcomingRes.json() : Promise.resolve({ data: [] }),
      upcomingRes2.ok ? upcomingRes2.json() : Promise.resolve({ data: [] }),
      upcomingRes3.ok ? upcomingRes3.json() : Promise.resolve({ data: [] }),
    ]);

    const rawCurrent: unknown[] = liveJson.data ?? [];
    const rawMatches0: unknown[] = upcomingJson.data ?? [];
    const rawMatches25: unknown[] = upcomingJson2.data ?? [];
    const rawMatches50: unknown[] = upcomingJson3.data ?? [];

    console.log('[CricAPI] raw counts — currentMatches:', rawCurrent.length, '| matches@0:', rawMatches0.length, '| matches@25:', rawMatches25.length, '| matches@50:', rawMatches50.length);

    const liveMatches: CricMatch[] = rawCurrent.map((m) => normalise(m, true));
    const upcomingRaw: CricMatch[] = [
      ...rawMatches0,
      ...rawMatches25,
      ...rawMatches50,
    ].map((m) => normalise(m, false));

    // De-duplicate: live takes precedence, then deduplicate upcoming pages
    const seen = new Set<string>(liveMatches.map((m) => m.id));
    const dedupedUpcoming = upcomingRaw.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

    // Sort by date ascending
    const all = [...liveMatches, ...dedupedUpcoming];
    all.sort((a, b) => {
      const da = new Date(a.dateTimeLocal || a.date).getTime();
      const db = new Date(b.dateTimeLocal || b.date).getTime();
      if (isNaN(da) && isNaN(db)) return 0;
      if (isNaN(da)) return 1;
      if (isNaN(db)) return -1;
      return da - db;
    });

    const debug = {
      currentMatches: rawCurrent.length,
      matches0: rawMatches0.length,
      matches25: rawMatches25.length,
      matches50: rawMatches50.length,
      total: all.length,
    };

    console.log('[CricAPI] after dedup & sort — total:', all.length);

    return Response.json({ matches: all, debug });
  } catch (err) {
    console.error('[CricAPI] fetch error:', err);
    return Response.json({ matches: [], debug: { currentMatches: 0, matches0: 0, matches25: 0, matches50: 0, total: 0 } });
  }
}
