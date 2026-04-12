import { NextRequest } from 'next/server';
import { runSync } from '@/lib/syncMatches';

export { runSync };

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-sync-secret');
  if (secret !== process.env.SYNC_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return runSync();
}
