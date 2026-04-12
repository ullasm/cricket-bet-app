import { NextRequest } from 'next/server';
import { fetchSeriesInfo, parseSeriesInfoToMatches } from '@/lib/cricapiSeries';
import { saveSourceData, markSourceDataParsed, upsertMasterMatch } from '@/lib/masterMatches';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-sync-secret');
  if (secret !== process.env.SYNC_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { cricapiId: string; seriesName: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { cricapiId, seriesName } = body;
  if (!cricapiId || !seriesName) {
    return Response.json({ error: 'cricapiId and seriesName are required' }, { status: 400 });
  }

  // 1. Fetch raw series info from CricAPI
  let raw;
  try {
    raw = await fetchSeriesInfo(cricapiId);
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }

  // 2. Store raw response in sourceData
  const sourceDataId = await saveSourceData({
    type: 'series_info',
    api: 'cricapi',
    data: JSON.stringify(raw),
    parsed: false,
  });

  // 3. Parse into masterMatch records
  const matches = parseSeriesInfoToMatches(raw, cricapiId, seriesName);

  // 4. Upsert all matches
  await Promise.all(matches.map((m) => upsertMasterMatch(m)));

  // 5. Mark sourceData as parsed
  await markSourceDataParsed(sourceDataId);

  return Response.json({ inserted: matches.length, sourceDataId });
}
