import { runSync } from '@/lib/syncMatches';

export async function GET(): Promise<Response> {
  return runSync();
}
