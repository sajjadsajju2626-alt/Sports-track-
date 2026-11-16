export type HouseId = 'red' | 'blue' | 'green' | 'yellow';
export type EventType = 'individual' | 'team';
export type EventStatus = 'UPCOMING' | 'LIVE' | 'FINISHED';

export interface HouseConfig {
  id: HouseId;
  name: string;
  color: string;
}

export interface PointRules {
  individual: [number, number, number];
  team: [number, number, number];
}

export interface WinnerEntry {
  place: 1 | 2 | 3;
  chestNo: string;
  name: string;
  house: HouseId | '';
  metric: string;
}

export interface LiveMatchState {
  teamAHouse: HouseId;
  teamBHouse: HouseId;
  scoreA: number;
  scoreB: number;
  periodLabel?: string;
}

export interface SportEvent {
  id: string;
  name: string;
  category: string;
  type: EventType;
  venue: string;
  status: EventStatus;
  winners: WinnerEntry[];
  liveMatch?: LiveMatchState;
  updatedAt: number;
}

export interface StudentRecord {
  chestNo: string;
  name: string;
  house: HouseId;
  category: string;
}

export interface SportsDayState {
  schoolName: string;
  tickerMessage: string;
  houses: Record<HouseId, HouseConfig>;
  pointRules: PointRules;
  events: SportEvent[];
  students: StudentRecord[];
  lastPublishedAt: number;
  lastPublishedTitle: string;
}

export interface HouseStanding {
  id: HouseId;
  name: string;
  color: string;
  points: number;
  gold: number;
  silver: number;
  bronze: number;
  rank: number;
}

export interface AthleteTally {
  key: string;
  chestNo: string;
  name: string;
  house: HouseId;
  division: 'boys' | 'girls' | 'open';
  points: number;
  gold: number;
  silver: number;
  bronze: number;
}

export const DEFAULT_POINT_RULES: PointRules = {
  individual: [5, 3, 1],
  team: [10, 6, 4],
};

export function normalizeHouseId(raw: string): HouseId | null {
  const val = raw.trim().toLowerCase();
  if (val === 'red' || val.startsWith('red ')) return 'red';
  if (val === 'blue' || val.startsWith('blue ')) return 'blue';
  if (val === 'green' || val.startsWith('green ')) return 'green';
  if (val === 'yellow' || val.startsWith('yellow ') || val === 'gold') return 'yellow';
  return null;
}

export function inferDivision(category: string): 'boys' | 'girls' | 'open' {
  const lower = category.toLowerCase();
  if (/(girl|women|female|ladies)/.test(lower)) return 'girls';
  if (/(boy|men|male)/.test(lower)) return 'boys';
  return 'open';
}

export function parseStudentCsv(csvText: string): StudentRecord[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const records: StudentRecord[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const parts = line.split(',').map((p) => p.trim());
    if (parts.length < 3) continue;

    // Skip CSV header row if present
    if (
      parts[0].toLowerCase().includes('chest') &&
      parts[1].toLowerCase().includes('name')
    ) {
      continue;
    }

    const chestNo = parts[0];
    const name = parts[1];
    const house = normalizeHouseId(parts[2]);
    const category = parts[3] || 'Open';

    if (!chestNo || !name || !house) continue;
    const key = chestNo.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    records.push({ chestNo, name, house, category });
  }

  return records;
}

export function computeHouseStandings(state: SportsDayState): HouseStanding[] {
  const totals: Record<HouseId, HouseStanding> = {
    red: { ...state.houses.red, points: 0, gold: 0, silver: 0, bronze: 0, rank: 1 },
    blue: { ...state.houses.blue, points: 0, gold: 0, silver: 0, bronze: 0, rank: 1 },
    green: { ...state.houses.green, points: 0, gold: 0, silver: 0, bronze: 0, rank: 1 },
    yellow: { ...state.houses.yellow, points: 0, gold: 0, silver: 0, bronze: 0, rank: 1 },
  };

  for (const ev of state.events) {
    if (ev.status !== 'FINISHED') continue;
    const ruleSet = ev.type === 'team' ? state.pointRules.team : state.pointRules.individual;

    for (const w of ev.winners) {
      if (!w.house || !totals[w.house]) continue;
      const pts = ruleSet[w.place - 1] ?? 0;
      totals[w.house].points += pts;
      if (w.place === 1) totals[w.house].gold += 1;
      if (w.place === 2) totals[w.house].silver += 1;
      if (w.place === 3) totals[w.house].bronze += 1;
    }
  }

  const sorted = Object.values(totals).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gold !== a.gold) return b.gold - a.gold;
    if (b.silver !== a.silver) return b.silver - a.silver;
    return b.bronze - a.bronze;
  });

  return sorted.map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));
}

export function computeTopAthletes(state: SportsDayState): AthleteTally[] {
  const map = new Map<string, AthleteTally>();

  for (const ev of state.events) {
    if (ev.status !== 'FINISHED' || ev.type !== 'individual') continue;
    const ruleSet = state.pointRules.individual;
    const division = inferDivision(ev.category);

    for (const w of ev.winners) {
      if (!w.name.trim() || !w.house) continue;
      const key = w.chestNo.trim()
        ? `chest:${w.chestNo.trim().toLowerCase()}`
        : `name:${w.name.trim().toLowerCase()}:${w.house}`;

      const pts = ruleSet[w.place - 1] ?? 0;
      const existing = map.get(key) || {
        key,
        chestNo: w.chestNo.trim(),
        name: w.name.trim(),
        house: w.house,
        division,
        points: 0,
        gold: 0,
        silver: 0,
        bronze: 0,
      };

      existing.points += pts;
      if (w.place === 1) existing.gold += 1;
      if (w.place === 2) existing.silver += 1;
      if (w.place === 3) existing.bronze += 1;
      if (existing.division === 'open' && division !== 'open') {
        existing.division = division;
      }

      map.set(key, existing);
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gold !== a.gold) return b.gold - a.gold;
    if (b.silver !== a.silver) return b.silver - a.silver;
    return b.bronze - a.bronze;
  });
}

export function formatStopwatch(ms: number): string {
  const clamped = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(clamped / 60000);
  const seconds = Math.floor((clamped % 60000) / 1000);
  const centis = Math.floor((clamped % 1000) / 10);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
}

export function validatePinRole(pin: string): 'official' | 'admin' | null {
  const trimmed = pin.trim();
  if (trimmed === '1111') return 'official';
  if (trimmed === '7860') return 'admin';
  return null;
}
