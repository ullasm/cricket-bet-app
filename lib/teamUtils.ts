const KNOWN_ABBREVIATIONS: Record<string, string> = {
  'sunrisers hyderabad': 'SRH',
  'royal challengers bengaluru': 'RCB',
  'royal challengers bangalore': 'RCB',
  'chennai super kings': 'CSK',
  'mumbai indians': 'MI',
  'kolkata knight riders': 'KKR',
  'delhi capitals': 'DC',
  'punjab kings': 'PBKS',
  'rajasthan royals': 'RR',
  'gujarat titans': 'GT',
  'lucknow super giants': 'LSG',
};

export function abbreviateTeam(name: string): string {
  const key = name.trim().toLowerCase();
  if (KNOWN_ABBREVIATIONS[key]) return KNOWN_ABBREVIATIONS[key];
  const words = name.trim().split(/\s+/);
  if (words.length <= 1) return name;
  return words.map((w) => w[0].toUpperCase()).join('');
}

export function parseTeamNames(matchName: string): { teamA: string; teamB: string } {
  const parts = matchName.split(/ vs | v /i);
  if (parts.length >= 2) {
    return {
      teamA: parts[0].trim(),
      teamB: parts[1].split(',')[0].trim(),
    };
  }
  return { teamA: matchName.trim(), teamB: 'TBD' };
}
