export type HouseId = 'red' | 'blue' | 'green' | 'yellow';
export type EventType = 'individual' | 'group' | 'team' | 'cricket' | 'relay';
export type CanonicalEventType = 'individual' | 'group' | 'team' | 'cricket';
export type EventStatus = 'UPCOMING' | 'LIVE' | 'FINISHED';
export type WorkspaceStatus = 'Active' | 'Suspended';

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

export type MatchTimelineEventType = 'goal' | 'yellow' | 'red';

export interface MatchTimelineEvent {
  id: string;
  side: 'A' | 'B';
  type: MatchTimelineEventType;
  chestNo: string;
  playerName: string;
  minute: number;
  createdAt: number;
}

export type MatchPhase = '1st Half' | 'Half Time' | '2nd Half' | 'Full Time';
export const MATCH_DURATION_PRESETS = [20, 30, 40, 60, 90] as const;

export interface LiveMatchState {
  teamAHouse: HouseId;
  teamBHouse: HouseId;
  scoreA: number;
  scoreB: number;
  wicketsA?: number;
  wicketsB?: number;
  oversA?: string;
  oversB?: string;
  periodLabel?: string;
  matchDurationMins?: number;
  matchPhase?: MatchPhase | string | null;
  addedTimeMins?: number;
  halfTimeAlertPlayed?: boolean;
  fullTimeAlertPlayed?: boolean;
  clockElapsedMs?: number;
  clockStartedAt?: number | null;
  clockRunning?: boolean;
  timeline?: MatchTimelineEvent[];
}

export interface GoalCelebrationPayload {
  eventId: string;
  eventName: string;
  houseId: HouseId;
  houseName: string;
  playerName: string;
  chestNo: string;
  minute: number | null;
  scoreA: number;
  scoreB: number;
}

export interface SportEvent {
  id: string;
  name: string;
  category: string;
  type: EventType;
  venue: string;
  status: EventStatus;
  winners: WinnerEntry[];
  participantIds?: string[];
  liveMatch?: LiveMatchState;
  updatedAt: number;
}

export interface StudentRecord {
  chestNo: string;
  name: string;
  house: HouseId;
  category: string;
  items?: string[];
}

export interface SchoolWorkspaceMeta {
  code: string;
  name: string;
  adminPin: string;
  officialPin: string;
  status: WorkspaceStatus;
  createdAt: number;
}

export interface SportsDayState {
  schoolCode?: string;
  schoolName: string;
  adminPin?: string;
  officialPin?: string;
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

export interface HouseWinnerContribution {
  place: 1 | 2 | 3;
  chestNo: string;
  name: string;
  metric: string;
  points: number;
}

export interface HouseEventContribution {
  eventId: string;
  eventName: string;
  category: string;
  type: EventType;
  points: number;
  sharePct: number;
  gold: number;
  silver: number;
  bronze: number;
  entries: HouseWinnerContribution[];
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

export function normalizeSchoolCode(raw: string): string {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '');
}

export function validateWorkspacePin(
  pin: string,
  pins: { masterPin: string; adminPin?: string; officialPin?: string }
): 'master' | 'admin' | 'official' | null {
  const trimmed = String(pin || '').trim();
  if (!trimmed) return null;
  if (pins.masterPin && trimmed === pins.masterPin) return 'master';
  if (pins.adminPin && trimmed === pins.adminPin) return 'admin';
  if (pins.officialPin && trimmed === pins.officialPin) return 'official';
  return null;
}

export interface SchoolAdminSettingsPatch {
  schoolName: string;
  tickerMessage: string;
  houseNames: Record<HouseId, string>;
  pointRules: PointRules;
}

export function applySchoolAdminSettingsUpdate(
  state: SportsDayState,
  meta: SchoolWorkspaceMeta | null | undefined,
  patch: SchoolAdminSettingsPatch
): { nextState: SportsDayState; nextMeta: SchoolWorkspaceMeta | null } {
  const schoolName = String(patch.schoolName || '').trim() || 'Annual Sports & Games Meet';
  const tickerMessage = String(patch.tickerMessage || '').trim() || 'Annual Sports Day Live';

  const preservedAdminPin = meta?.adminPin ?? state.adminPin;
  const preservedOfficialPin = meta?.officialPin ?? state.officialPin;

  const nextState: SportsDayState = {
    ...state,
    schoolName,
    tickerMessage,
    ...(preservedAdminPin !== undefined ? { adminPin: preservedAdminPin } : {}),
    ...(preservedOfficialPin !== undefined ? { officialPin: preservedOfficialPin } : {}),
    houses: {
      red: { ...state.houses.red, name: String(patch.houseNames.red || '').trim() || 'Red House' },
      blue: { ...state.houses.blue, name: String(patch.houseNames.blue || '').trim() || 'Blue House' },
      green: { ...state.houses.green, name: String(patch.houseNames.green || '').trim() || 'Green House' },
      yellow: { ...state.houses.yellow, name: String(patch.houseNames.yellow || '').trim() || 'Yellow House' },
    },
    pointRules: {
      individual: [
        Number(patch.pointRules.individual[0] ?? 5),
        Number(patch.pointRules.individual[1] ?? 3),
        Number(patch.pointRules.individual[2] ?? 1),
      ],
      team: [
        Number(patch.pointRules.team[0] ?? 10),
        Number(patch.pointRules.team[1] ?? 6),
        Number(patch.pointRules.team[2] ?? 4),
      ],
    },
  };

  const nextMeta: SchoolWorkspaceMeta | null = meta
    ? {
        ...meta,
        name: schoolName,
        adminPin: meta.adminPin,
        officialPin: meta.officialPin,
      }
    : null;

  return { nextState, nextMeta };
}

export function buildInviteMessage(meta: {
  name: string;
  code: string;
  adminPin: string;
  officialPin: string;
}): string {
  return [
    `*${meta.name} — Annual Sports & Games Meet*`,
    `Open the Sports Meet portal and enter:`,
    `School Code: *${meta.code}*`,
    ``,
    `Role PINs:`,
    `• Sports Admin (PE Teacher): *${meta.adminPin}*`,
    `• Ground Official / Referee: *${meta.officialPin}*`,
    `(Students & parents can view live scores using the School Code without a PIN.)`,
  ].join('\n');
}

export function buildPublicShareUrl(currentHref: string, schoolCode: string): string {
  const code = normalizeSchoolCode(schoolCode);
  try {
    const url = new URL(currentHref);
    url.search = '';
    url.hash = '';
    if (code) {
      url.searchParams.set('code', code);
    }
    return url.toString();
  } catch {
    return code ? `?code=${encodeURIComponent(code)}` : currentHref;
  }
}

export function generateCsvTemplate(): string {
  return [
    'ChestNo,Name,House,Category,Items',
    '101,Aarav Sharma,Red,Junior Boys,"100m Sprint, Long Jump"',
    '102,Priya Nair,Blue,Senior Girls,"Shot Put, High Jump"',
  ].join('\n');
}

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

export function resolveEffectiveEventType(
  ev: Pick<SportEvent, 'name' | 'type'> | null | undefined
): CanonicalEventType {
  if (!ev) return 'individual';
  const rawType = String(ev.type || '').trim().toLowerCase();
  const name = String(ev.name || '');

  if (/cricket/i.test(name)) return 'cricket';
  if (/(relay|march\s*past|three[- ]?legged)/i.test(name)) {
    return 'group';
  }
  if (
    /(football|soccer|futsal|kabaddi|basketball|volleyball|badminton|table\s*tennis|tug\s*of\s*war|kho[- ]?kho|hockey|handball|throwball)/i.test(
      name
    )
  ) {
    return 'team';
  }
  if (rawType === 'cricket') return 'cricket';
  if (rawType === 'group' || rawType === 'relay') return 'group';
  if (rawType === 'team') return 'team';
  return 'individual';
}

export type LiveMatchSportProfileId = 'football' | 'kabaddi' | 'basketball' | 'set_match';

export interface LiveMatchScoreButton {
  delta: number;
  label: string;
  tone: 'minus' | 'primary' | 'accent' | 'goal';
  matchEvent?: MatchTimelineEventType;
}

export interface LiveMatchSportProfile {
  id: LiveMatchSportProfileId;
  showClock: boolean;
  showFootballControls: boolean;
  periodLabelTitle: string;
  periodPresets: string[];
  scoreButtons: LiveMatchScoreButton[];
}

export function detectLiveMatchSportProfile(eventName: string | undefined): LiveMatchSportProfile {
  const name = String(eventName || '');
  if (/kabaddi/i.test(name)) {
    return {
      id: 'kabaddi',
      showClock: true,
      showFootballControls: false,
      periodLabelTitle: 'Half / Period',
      periodPresets: ['1st Half', 'Half Time', '2nd Half', 'Extra Time'],
      scoreButtons: [
        { delta: -1, label: '-1', tone: 'minus' },
        { delta: 1, label: '+1 Point', tone: 'primary' },
        { delta: 2, label: '+2 Super / All-Out', tone: 'accent' },
      ],
    };
  }
  if (/basketball/i.test(name)) {
    return {
      id: 'basketball',
      showClock: true,
      showFootballControls: false,
      periodLabelTitle: 'Quarter / Period',
      periodPresets: ['Q1', 'Q2', 'Half Time', 'Q3', 'Q4', 'OT'],
      scoreButtons: [
        { delta: -1, label: '-1', tone: 'minus' },
        { delta: 1, label: '+1', tone: 'primary' },
        { delta: 2, label: '+2', tone: 'accent' },
        { delta: 3, label: '+3', tone: 'accent' },
      ],
    };
  }
  if (/(volleyball|badminton|tug\s*of\s*war|table\s*tennis|tennis|throwball)/i.test(name)) {
    const isRoundBased = /tug\s*of\s*war/i.test(name);
    return {
      id: 'set_match',
      showClock: false,
      showFootballControls: false,
      periodLabelTitle: isRoundBased ? 'Round' : 'Set',
      periodPresets: isRoundBased ? ['Round 1', 'Round 2', 'Round 3'] : ['Set 1', 'Set 2', 'Set 3'],
      scoreButtons: [
        { delta: -1, label: '-1', tone: 'minus' },
        { delta: 1, label: '+1 Point', tone: 'primary' },
      ],
    };
  }
  return {
    id: 'football',
    showClock: true,
    showFootballControls: true,
    periodLabelTitle: 'Half / Period',
    periodPresets: ['1st Half', 'Half Time', '2nd Half', 'Extra Time'],
    scoreButtons: [
      { delta: -1, label: '-1', tone: 'minus' },
      { delta: 1, label: '+1 Goal ⚽', tone: 'goal', matchEvent: 'goal' },
    ],
  };
}

export function isRelayEvent(ev: Pick<SportEvent, 'name' | 'type'> | null | undefined): boolean {
  return resolveEffectiveEventType(ev) === 'group';
}

export function isHouseGroupPodiumEvent(
  ev: Pick<SportEvent, 'name' | 'type'> | null | undefined
): boolean {
  return resolveEffectiveEventType(ev) === 'group';
}

export function isCricketEvent(
  ev: Pick<SportEvent, 'name' | 'type'> | null | undefined
): boolean {
  return resolveEffectiveEventType(ev) === 'cricket';
}

export function getEventPointRules(
  state: Pick<SportsDayState, 'pointRules'>,
  ev: Pick<SportEvent, 'name' | 'type'>
): [number, number, number] {
  const effective = resolveEffectiveEventType(ev);
  if (effective === 'team' || effective === 'group' || effective === 'cricket') {
    return state.pointRules.team;
  }
  return state.pointRules.individual;
}

export function getEventTypeLabel(ev: Pick<SportEvent, 'name' | 'type'>): string {
  const effective = resolveEffectiveEventType(ev);
  if (effective === 'group') return 'House / Group Podium';
  if (effective === 'cricket') return 'Cricket Match';
  if (effective === 'team') return '1 vs 1 Live Match';
  return 'Individual Event';
}

export function formatCricketScore(
  runs: number | undefined,
  wickets: number | undefined,
  overs?: string | undefined
): string {
  const safeRuns = Math.max(0, Math.floor(Number(runs) || 0));
  const safeWickets = Math.max(0, Math.min(10, Math.floor(Number(wickets) || 0)));
  const cleanOvers = String(overs ?? '').trim();
  const base = `${safeRuns}/${safeWickets}`;
  return cleanOvers ? `${base} (${cleanOvers} Ov)` : base;
}

export function incrementCricketOvers(oversStr: string | undefined, deltaBalls: number): string {
  const raw = String(oversStr || '0.0').trim();
  const match = raw.match(/^(\d+)(?:\.(\d))?$/);
  const wholeOvers = match ? Number(match[1]) : 0;
  const subBalls = match && match[2] !== undefined ? Math.min(5, Math.max(0, Number(match[2]))) : 0;
  const totalBalls = Math.max(0, wholeOvers * 6 + subBalls + Math.trunc(deltaBalls));
  const nextOvers = Math.floor(totalBalls / 6);
  const nextBalls = totalBalls % 6;
  return `${nextOvers}.${nextBalls}`;
}

export function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

export function parseItemsList(raw: string): string[] {
  return String(raw || '')
    .split(/[,;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function isStudentRegisteredForEvent(
  student: Pick<StudentRecord, 'items'> | null | undefined,
  eventName: string
): boolean | null {
  const items = student?.items;
  if (!Array.isArray(items) || items.length === 0) return null;

  const normalizeToken = (s: string) =>
    String(s || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  const stripStage = (s: string) =>
    normalizeToken(s)
      .replace(/\s+(final|finals|heats|heat\s*\d*|semi-?final\s*\d*|quarter-?final\s*\d*)$/i, '')
      .trim();

  const targetNorm = normalizeToken(eventName);
  const targetBase = stripStage(eventName);
  if (!targetNorm) return null;

  return items.some((item) => {
    const itemNorm = normalizeToken(item);
    const itemBase = stripStage(item);
    return itemNorm === targetNorm || (Boolean(itemBase) && itemBase === targetBase);
  });
}

export function parseStudentCsv(csvText: string): StudentRecord[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const records: StudentRecord[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const parts = parseCsvRow(line);
    if (parts.length < 3) continue;

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
    const rawItems = parts.length > 5 ? parts.slice(4).join(',') : parts[4] || '';
    const items = parseItemsList(rawItems);

    if (!chestNo || !name || !house) continue;
    const key = chestNo.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    records.push({ chestNo, name, house, category, items });
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
    const ruleSet = getEventPointRules(state, ev);

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

export function computeHousePointBreakdown(
  state: SportsDayState,
  houseId: HouseId
): HouseEventContribution[] {
  const contributions: HouseEventContribution[] = [];
  let houseTotalPoints = 0;

  for (const ev of state.events) {
    if (ev.status !== 'FINISHED') continue;
    const ruleSet = getEventPointRules(state, ev);
    const entries: HouseWinnerContribution[] = [];
    let eventPoints = 0;
    let gold = 0;
    let silver = 0;
    let bronze = 0;

    for (const w of ev.winners) {
      if (w.house !== houseId) continue;
      const pts = ruleSet[w.place - 1] ?? 0;
      eventPoints += pts;
      if (w.place === 1) gold += 1;
      if (w.place === 2) silver += 1;
      if (w.place === 3) bronze += 1;
      entries.push({
        place: w.place,
        chestNo: w.chestNo,
        name: w.name,
        metric: w.metric,
        points: pts,
      });
    }

    if (entries.length > 0) {
      entries.sort((a, b) => a.place - b.place);
      houseTotalPoints += eventPoints;
      contributions.push({
        eventId: ev.id,
        eventName: ev.name,
        category: ev.category,
        type: ev.type,
        points: eventPoints,
        sharePct: 0,
        gold,
        silver,
        bronze,
        entries,
      });
    }
  }

  return contributions
    .map((item) => ({
      ...item,
      sharePct: houseTotalPoints > 0 ? Math.round((item.points / houseTotalPoints) * 100) : 0,
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gold !== a.gold) return b.gold - a.gold;
      if (b.silver !== a.silver) return b.silver - a.silver;
      if (b.bronze !== a.bronze) return b.bronze - a.bronze;
      return a.eventName.localeCompare(b.eventName);
    });
}

export function computeTopAthletes(state: SportsDayState): AthleteTally[] {
  const map = new Map<string, AthleteTally>();

  for (const ev of state.events) {
    if (ev.status !== 'FINISHED' || resolveEffectiveEventType(ev) !== 'individual') continue;
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

export function getEditablePeriodValue(periodLabel?: string): string {
  const trimmed = String(periodLabel || '').trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (lower === 'live match' || lower === 'scheduled') return '';
  return trimmed;
}

export function createRevertedUpcomingEvent(ev: SportEvent, now: number = Date.now()): SportEvent {
  const effective = resolveEffectiveEventType(ev);
  return {
    ...ev,
    status: 'UPCOMING',
    winners: [],
    liveMatch: ev.liveMatch
      ? {
          ...ev.liveMatch,
          scoreA: 0,
          scoreB: 0,
          ...(effective === 'cricket' ? { wicketsA: 0, wicketsB: 0, oversA: '0.0', oversB: '0.0' } : {}),
          ...(effective === 'team'
            ? {
                clockElapsedMs: 0,
                clockStartedAt: null,
                clockRunning: false,
                matchDurationMins: 30,
                matchPhase: null,
                addedTimeMins: 0,
                halfTimeAlertPlayed: false,
                fullTimeAlertPlayed: false,
                timeline: [],
              }
            : {}),
          periodLabel: 'Scheduled',
        }
      : {
          teamAHouse: 'red',
          teamBHouse: 'blue',
          scoreA: 0,
          scoreB: 0,
          ...(effective === 'cricket' ? { wicketsA: 0, wicketsB: 0, oversA: '0.0', oversB: '0.0' } : {}),
          ...(effective === 'team'
            ? {
                clockElapsedMs: 0,
                clockStartedAt: null,
                clockRunning: false,
                matchDurationMins: 30,
                matchPhase: null,
                addedTimeMins: 0,
                halfTimeAlertPlayed: false,
                fullTimeAlertPlayed: false,
                timeline: [],
              }
            : {}),
          periodLabel: 'Scheduled',
        },
    updatedAt: now,
  };
}

export function getMatchDurationMins(
  liveMatch: Pick<LiveMatchState, 'matchDurationMins'> | null | undefined
): number {
  const raw = Number(liveMatch?.matchDurationMins);
  if (Number.isFinite(raw) && raw >= 2) return Math.round(raw);
  return 30;
}

export function resolveMatchPhase(
  liveMatch: Pick<LiveMatchState, 'matchPhase' | 'periodLabel' | 'clockElapsedMs' | 'clockRunning'> | null | undefined
): MatchPhase | '' {
  const rawPhase = String(liveMatch?.matchPhase || '').trim().toLowerCase();
  if (rawPhase === 'full time') return 'Full Time';
  if (rawPhase === 'half time') return 'Half Time';
  if (rawPhase === '2nd half') return '2nd Half';
  if (rawPhase === '1st half') return '1st Half';

  const rawPeriod = String(liveMatch?.periodLabel || '').trim().toLowerCase();
  if (rawPeriod.includes('full time')) return 'Full Time';
  if (rawPeriod.includes('half time')) return 'Half Time';
  if (rawPeriod.includes('2nd half')) return '2nd Half';
  if (rawPeriod.includes('1st half')) return '1st Half';

  if (liveMatch?.clockRunning || Number(liveMatch?.clockElapsedMs || 0) > 0) {
    return '1st Half';
  }
  return '';
}

export function computeMatchClockElapsedMs(
  liveMatch: Pick<LiveMatchState, 'clockElapsedMs' | 'clockStartedAt' | 'clockRunning'> | null | undefined,
  nowMs: number = Date.now()
): number {
  const base = Math.max(0, Number(liveMatch?.clockElapsedMs || 0));
  if (liveMatch?.clockRunning && typeof liveMatch.clockStartedAt === 'number' && liveMatch.clockStartedAt > 0) {
    return base + Math.max(0, nowMs - liveMatch.clockStartedAt);
  }
  return base;
}

export function formatMatchClockMMSS(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function computeMatchMinute(
  liveMatch: Pick<LiveMatchState, 'clockElapsedMs' | 'clockStartedAt' | 'clockRunning'> | null | undefined,
  nowMs: number = Date.now()
): number {
  const elapsedMs = computeMatchClockElapsedMs(liveMatch, nowMs);
  if (elapsedMs <= 0) return 0;
  return Math.max(1, Math.ceil(elapsedMs / 60000));
}

export function evaluateMatchThresholdAlert(
  liveMatch:
    | Pick<
        LiveMatchState,
        | 'matchDurationMins'
        | 'matchPhase'
        | 'periodLabel'
        | 'clockElapsedMs'
        | 'clockStartedAt'
        | 'clockRunning'
        | 'halfTimeAlertPlayed'
        | 'fullTimeAlertPlayed'
      >
    | null
    | undefined,
  nowMs: number = Date.now()
): { type: 'half' | 'full' | null; halfMarkMs: number; fullMarkMs: number } {
  const durationMins = getMatchDurationMins(liveMatch);
  const fullMarkMs = durationMins * 60_000;
  const halfMarkMs = Math.round((durationMins / 2) * 60_000);
  if (!liveMatch?.clockRunning) {
    return { type: null, halfMarkMs, fullMarkMs };
  }
  const phase = resolveMatchPhase(liveMatch);
  const elapsedMs = computeMatchClockElapsedMs(liveMatch, nowMs);

  if (elapsedMs >= fullMarkMs && !liveMatch.fullTimeAlertPlayed) {
    return { type: 'full', halfMarkMs, fullMarkMs };
  }
  if ((phase === '1st Half' || phase === '') && elapsedMs >= halfMarkMs && !liveMatch.halfTimeAlertPlayed) {
    return { type: 'half', halfMarkMs, fullMarkMs };
  }
  return { type: null, halfMarkMs, fullMarkMs };
}

export function applyMatchClockCommand(
  liveMatch: LiveMatchState,
  command: 'start' | 'pause' | 'reset' | MatchPhase,
  nowMs: number = Date.now()
): LiveMatchState {
  const durationMins = getMatchDurationMins(liveMatch);
  const halfMarkMs = Math.round((durationMins / 2) * 60_000);
  const elapsedMs = computeMatchClockElapsedMs(liveMatch, nowMs);
  const currentPhase = resolveMatchPhase(liveMatch);

  if (command === 'start') {
    if (liveMatch.clockRunning) return liveMatch;
    const nextPhase: MatchPhase =
      currentPhase === 'Half Time'
        ? '2nd Half'
        : currentPhase === 'Full Time' || currentPhase === ''
          ? '1st Half'
          : currentPhase;
    return {
      ...liveMatch,
      matchDurationMins: durationMins,
      matchPhase: nextPhase,
      periodLabel: nextPhase,
      clockElapsedMs: elapsedMs,
      clockStartedAt: nowMs,
      clockRunning: true,
    };
  }

  if (command === 'pause') {
    return {
      ...liveMatch,
      matchDurationMins: durationMins,
      clockElapsedMs: elapsedMs,
      clockStartedAt: null,
      clockRunning: false,
    };
  }

  if (command === 'reset') {
    return {
      ...liveMatch,
      matchDurationMins: durationMins,
      matchPhase: '1st Half',
      periodLabel: '1st Half',
      addedTimeMins: 0,
      halfTimeAlertPlayed: false,
      fullTimeAlertPlayed: false,
      clockElapsedMs: 0,
      clockStartedAt: null,
      clockRunning: false,
    };
  }

  if (command === '1st Half') {
    return {
      ...liveMatch,
      matchDurationMins: durationMins,
      matchPhase: '1st Half',
      periodLabel: '1st Half',
    };
  }

  if (command === 'Half Time') {
    return {
      ...liveMatch,
      matchDurationMins: durationMins,
      matchPhase: 'Half Time',
      periodLabel: 'Half Time',
      addedTimeMins: 0,
      halfTimeAlertPlayed: true,
      clockElapsedMs: elapsedMs,
      clockStartedAt: null,
      clockRunning: false,
    };
  }

  if (command === '2nd Half') {
    const alreadyRunningSecondHalf =
      currentPhase === '2nd Half' && Boolean(liveMatch.clockRunning) && elapsedMs >= halfMarkMs;
    if (alreadyRunningSecondHalf) {
      return {
        ...liveMatch,
        matchDurationMins: durationMins,
        matchPhase: '2nd Half',
        periodLabel: '2nd Half',
      };
    }
    return {
      ...liveMatch,
      matchDurationMins: durationMins,
      matchPhase: '2nd Half',
      periodLabel: '2nd Half',
      addedTimeMins: 0,
      halfTimeAlertPlayed: true,
      fullTimeAlertPlayed: false,
      clockElapsedMs: halfMarkMs,
      clockStartedAt: nowMs,
      clockRunning: true,
    };
  }

  // 'Full Time'
  return {
    ...liveMatch,
    matchDurationMins: durationMins,
    matchPhase: 'Full Time',
    periodLabel: 'Full Time',
    addedTimeMins: 0,
    fullTimeAlertPlayed: true,
    clockElapsedMs: elapsedMs,
    clockStartedAt: null,
    clockRunning: false,
  };
}

export function applyMatchDurationChange(
  liveMatch: LiveMatchState,
  durationMins: number,
  nowMs: number = Date.now()
): LiveMatchState {
  const safeMins = Math.max(2, Math.round(Number(durationMins) || 30));
  const halfMarkMs = Math.round((safeMins / 2) * 60_000);
  const fullMarkMs = safeMins * 60_000;
  const elapsedMs = computeMatchClockElapsedMs(liveMatch, nowMs);
  return {
    ...liveMatch,
    matchDurationMins: safeMins,
    halfTimeAlertPlayed: elapsedMs >= halfMarkMs,
    fullTimeAlertPlayed: elapsedMs >= fullMarkMs,
  };
}

export function applyAddedTimeChange(liveMatch: LiveMatchState, addedMins: number): LiveMatchState {
  const safeAdded = Math.max(0, Math.floor(Number(addedMins) || 0));
  return {
    ...liveMatch,
    addedTimeMins: safeAdded,
  };
}

export function formatLiveMatchStatusDisplay(
  liveMatch:
    | Pick<
        LiveMatchState,
        'periodLabel' | 'matchPhase' | 'addedTimeMins' | 'clockElapsedMs' | 'clockStartedAt' | 'clockRunning'
      >
    | null
    | undefined,
  nowMs: number = Date.now()
): string {
  const phase = resolveMatchPhase(liveMatch);
  if (phase === 'Half Time') return 'HALF TIME';
  if (phase === 'Full Time') return 'FULL TIME';

  const rawPeriod = String(liveMatch?.periodLabel || '').trim();
  const lowerPeriod = rawPeriod.toLowerCase();
  const isDefault = !rawPeriod || ['live match', 'scheduled'].includes(lowerPeriod);
  const elapsedMs = computeMatchClockElapsedMs(liveMatch, nowMs);
  const hasClock = Boolean(liveMatch?.clockRunning) || elapsedMs > 0;
  const mmss = formatMatchClockMMSS(elapsedMs);
  const added = Math.max(0, Math.floor(Number(liveMatch?.addedTimeMins || 0)));
  const addedSuffix = added > 0 ? ` (+${added}')` : '';

  if (phase === '1st Half' || phase === '2nd Half') {
    return `${phase} · ${mmss}${addedSuffix}`;
  }

  if (hasClock) {
    const label = isDefault ? '1st Half' : rawPeriod;
    return `${label} · ${mmss}${addedSuffix}`;
  }
  return rawPeriod || 'Live Match';
}

export function applyTeamScoreDelta(
  liveMatch: LiveMatchState,
  side: 'A' | 'B',
  delta: number
): { nextMatch: LiveMatchState; removedGoalId: string | null } {
  const s: 'A' | 'B' = side === 'B' ? 'B' : 'A';
  const prevScore = s === 'A' ? Number(liveMatch.scoreA || 0) : Number(liveMatch.scoreB || 0);
  const nextScore = Math.max(0, prevScore + delta);
  const nextTimeline = Array.isArray(liveMatch.timeline) ? [...liveMatch.timeline] : [];
  let removedGoalId: string | null = null;

  if (delta < 0 && prevScore > 0) {
    let targetIdx = -1;
    let bestCreatedAt = -Infinity;
    for (let i = 0; i < nextTimeline.length; i += 1) {
      const item = nextTimeline[i];
      if (item.side === s && item.type === 'goal') {
        const ts = Number(item.createdAt || 0);
        if (ts >= bestCreatedAt) {
          bestCreatedAt = ts;
          targetIdx = i;
        }
      }
    }
    if (targetIdx !== -1) {
      removedGoalId = nextTimeline[targetIdx].id;
      nextTimeline.splice(targetIdx, 1);
    }
  }

  return {
    removedGoalId,
    nextMatch: {
      ...liveMatch,
      scoreA: s === 'A' ? nextScore : liveMatch.scoreA,
      scoreB: s === 'B' ? nextScore : liveMatch.scoreB,
      timeline: nextTimeline,
    },
  };
}

export function extractCategoryGender(category: string | undefined): 'boys' | 'girls' | '' {
  const norm = String(category || '').trim().toLowerCase();
  if (/\b(boys?|men|male)\b/i.test(norm)) return 'boys';
  if (/\b(girls?|women|female)\b/i.test(norm)) return 'girls';
  return '';
}

export function normalizeParticipantIds(ids: ReadonlyArray<string> | null | undefined): string[] {
  if (!Array.isArray(ids)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    const clean = String(raw || '').trim().replace(/^#+/, '').trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(clean);
    }
  }
  return out;
}

export function groupStudentsByHouseForModal(
  students: ReadonlyArray<StudentRecord>,
  options?: { searchQuery?: string; categoryFilter?: string }
): Record<HouseId, StudentRecord[]> {
  const catFilter = String(options?.categoryFilter || '').trim().toLowerCase();
  const rawQuery = String(options?.searchQuery || '').trim().toLowerCase().replace(/^#+/, '').trim();

  const grouped: Record<HouseId, StudentRecord[]> = {
    red: [],
    blue: [],
    green: [],
    yellow: [],
  };

  for (const s of students || []) {
    const h = String(s.house || '').trim().toLowerCase() as HouseId;
    if (!grouped[h]) continue;
    if (catFilter && catFilter !== 'all') {
      if (String(s.category || '').trim().toLowerCase() !== catFilter) continue;
    }
    if (rawQuery) {
      const c = String(s.chestNo || '').toLowerCase();
      const n = String(s.name || '').toLowerCase();
      const cat = String(s.category || '').toLowerCase();
      if (!c.includes(rawQuery) && !n.includes(rawQuery) && !`${c} ${n}`.includes(rawQuery) && !cat.includes(rawQuery)) {
        continue;
      }
    }
    grouped[h].push(s);
  }

  for (const h of ['red', 'blue', 'green', 'yellow'] as const) {
    grouped[h].sort((a, b) =>
      String(a.chestNo || '').localeCompare(String(b.chestNo || ''), undefined, { numeric: true })
    );
  }

  return grouped;
}

export function resolveEventParticipants(
  students: ReadonlyArray<StudentRecord>,
  participantIds: ReadonlyArray<string> | null | undefined
): StudentRecord[] {
  const normalized = normalizeParticipantIds(participantIds);
  if (normalized.length === 0) return [];
  const idSet = new Set(normalized.map((id) => id.toLowerCase()));
  return (students || [])
    .filter((s) => idSet.has(String(s.chestNo || '').trim().replace(/^#+/, '').toLowerCase()))
    .sort((a, b) =>
      String(a.chestNo || '').localeCompare(String(b.chestNo || ''), undefined, { numeric: true })
    );
}

export function hasAssignedHouseParticipants(
  students: ReadonlyArray<StudentRecord>,
  houseId: HouseId | string,
  participantIds: ReadonlyArray<string> | null | undefined
): boolean {
  const normalized = normalizeParticipantIds(participantIds);
  if (normalized.length === 0) return false;
  const targetHouse = String(houseId || '').trim().toLowerCase();
  const idSet = new Set(normalized.map((id) => id.toLowerCase()));
  return (students || []).some(
    (s) =>
      String(s.house || '').trim().toLowerCase() === targetHouse &&
      idSet.has(String(s.chestNo || '').trim().replace(/^#+/, '').toLowerCase())
  );
}

export function filterHousePlayersForTagger(
  students: ReadonlyArray<StudentRecord>,
  houseId: HouseId | string,
  eventCategory?: string,
  searchQuery?: string,
  options?: { participantIds?: ReadonlyArray<string> | null; showAllHouse?: boolean }
): StudentRecord[] {
  const targetHouse = String(houseId || '').trim().toLowerCase();
  const houseStudents = (students || []).filter(
    (s) => String(s.house || '').trim().toLowerCase() === targetHouse
  );
  const sortByChest = (list: ReadonlyArray<StudentRecord>): StudentRecord[] =>
    [...list].sort((a, b) =>
      String(a.chestNo || '').localeCompare(String(b.chestNo || ''), undefined, { numeric: true })
    );

  const normalizedAssigned = normalizeParticipantIds(options?.participantIds);
  const assignedSet = new Set(normalizedAssigned.map((id) => id.toLowerCase()));
  const assignedHousePlayers =
    !options?.showAllHouse && assignedSet.size > 0
      ? houseStudents.filter((s) =>
          assignedSet.has(String(s.chestNo || '').trim().replace(/^#+/, '').toLowerCase())
        )
      : [];

  let baseCandidates: StudentRecord[];
  if (assignedHousePlayers.length > 0) {
    baseCandidates = assignedHousePlayers;
  } else {
    const catNorm = String(eventCategory || '').trim().toLowerCase();
    const exactCategoryMatches = catNorm
      ? houseStudents.filter((s) => String(s.category || '').trim().toLowerCase() === catNorm)
      : [];
    const targetGender = extractCategoryGender(catNorm);
    const genderMatches = targetGender
      ? houseStudents.filter((s) => extractCategoryGender(s.category) === targetGender)
      : [];

    baseCandidates =
      exactCategoryMatches.length > 0
        ? exactCategoryMatches
        : genderMatches.length > 0
          ? genderMatches
          : houseStudents;
  }

  const rawQuery = String(searchQuery || '').trim().toLowerCase().replace(/^#+/, '').trim();
  if (!rawQuery) {
    return sortByChest(baseCandidates);
  }

  const matchesQuery = (s: StudentRecord): boolean => {
    const c = String(s.chestNo || '').toLowerCase();
    const n = String(s.name || '').toLowerCase();
    return c.includes(rawQuery) || n.includes(rawQuery) || `${c} ${n}`.includes(rawQuery);
  };

  const filteredBase = baseCandidates.filter(matchesQuery);
  if (filteredBase.length > 0 || assignedHousePlayers.length > 0) {
    return sortByChest(filteredBase);
  }
  return sortByChest(houseStudents.filter(matchesQuery));
}

export function formatPlayerChipLabel(student: Pick<StudentRecord, 'chestNo' | 'name'>): string {
  const cleanChest = String(student.chestNo || '').trim().replace(/^#+/, '');
  const fullName = String(student.name || '').trim();
  const firstName = fullName.split(/\s+/)[0] || fullName;
  return cleanChest ? `#${cleanChest} ${firstName}` : firstName;
}

export function normalizeTimelinePlayer(
  rawName: string | undefined,
  rawChest: string | undefined,
  type: MatchTimelineEventType = 'goal'
): { name: string; chestNo: string } {
  let name = String(rawName || '').trim();
  let chest = String(rawChest || '').trim().replace(/^#+/, '').trim();

  if (chest) {
    const escapedChest = chest.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const dupSuffix = new RegExp(`\\s*\\(#?${escapedChest}\\)\\s*$`, 'i');
    name = name.replace(dupSuffix, '').trim();
  }

  const playerHashMatch = name.match(/^player\s*#+\s*(.+)$/i);
  if (playerHashMatch) {
    const extracted = playerHashMatch[1].trim().replace(/\s*\(#?.+\)\s*$/, '').trim();
    if (/^\d+[a-z]?$/i.test(extracted)) {
      chest = chest || extracted;
      name = 'Player';
    } else {
      name = extracted;
      if (chest.toLowerCase() === extracted.toLowerCase()) {
        chest = '';
      }
    }
  }

  const leadingChestMatch = name.match(/^#+(\d+[a-z]?)\s+(.+)$/i);
  if (leadingChestMatch) {
    if (!chest) chest = leadingChestMatch[1];
    name = leadingChestMatch[2].trim();
  }

  if (chest && !/^\d+[a-z]?$/i.test(chest)) {
    if (
      !name ||
      name.toLowerCase() === 'goal' ||
      name.toLowerCase() === 'team / unknown' ||
      name.toLowerCase() === 'player' ||
      name.toLowerCase() === chest.toLowerCase()
    ) {
      name = chest;
    }
    chest = '';
  }

  if (chest && (name.toLowerCase() === chest.toLowerCase() || name.toLowerCase() === `#${chest.toLowerCase()}`)) {
    name = 'Player';
  }

  if (!name) {
    name = chest ? 'Player' : type === 'goal' ? 'Goal' : 'Team / Unknown';
  }

  return { name, chestNo: chest };
}

export function resolveTimelineTagInput(
  rawInput: string | undefined,
  houseStudents: ReadonlyArray<StudentRecord>,
  allStudents: ReadonlyArray<StudentRecord>,
  kind: MatchTimelineEventType = 'goal'
): { name: string; chestNo: string } {
  const trimmed = String(rawInput || '').trim();
  if (!trimmed) {
    return { name: kind === 'goal' ? 'Goal' : 'Team / Unknown', chestNo: '' };
  }

  const qNorm = trimmed.replace(/^#+/, '').trim().toLowerCase();
  const findStudent = (pool: ReadonlyArray<StudentRecord>): StudentRecord | undefined => {
    const exactChest = pool.find((s) => String(s.chestNo || '').trim().toLowerCase() === qNorm);
    if (exactChest) return exactChest;
    const exactName = pool.find((s) => String(s.name || '').trim().toLowerCase() === qNorm);
    if (exactName) return exactName;
    const firstWordMatch = pool.find(
      (s) => (String(s.name || '').trim().split(/\s+/)[0] || '').toLowerCase() === qNorm
    );
    if (firstWordMatch) return firstWordMatch;
    const partial = pool.filter(
      (s) =>
        String(s.chestNo || '').toLowerCase().includes(qNorm) ||
        String(s.name || '').toLowerCase().includes(qNorm)
    );
    return partial.length === 1 ? partial[0] : undefined;
  };

  const matched = findStudent(houseStudents || []) || findStudent(allStudents || []);
  if (matched) {
    return normalizeTimelinePlayer(matched.name, matched.chestNo, kind);
  }

  const chestFirst = trimmed.match(/^#?(\d+[a-z]?)\s+(.+)$/i);
  if (chestFirst) {
    return normalizeTimelinePlayer(chestFirst[2], chestFirst[1], kind);
  }
  const chestLast = trimmed.match(/^(.+?)\s+\(?#?(\d+[a-z]?)\)?$/i);
  if (chestLast) {
    return normalizeTimelinePlayer(chestLast[1], chestLast[2], kind);
  }

  const cleanToken = trimmed.replace(/^player\s*#?/i, '').replace(/^#+/, '').trim();
  if (/^\d+[a-z]?$/i.test(cleanToken)) {
    return normalizeTimelinePlayer('Player', cleanToken, kind);
  }
  return normalizeTimelinePlayer(cleanToken, '', kind);
}

export function formatTimelineItemLabel(item: MatchTimelineEvent): string {
  const icon = item.type === 'goal' ? '⚽' : item.type === 'yellow' ? '🟨' : '🟥';
  const normalized = normalizeTimelinePlayer(item.playerName, item.chestNo, item.type);
  const who = normalized.chestNo ? `${normalized.name} (#${normalized.chestNo})` : normalized.name;
  const minVal = Math.max(0, Math.floor(Number(item.minute) || 0));
  return `${icon} ${who} ${minVal}'`;
}

export function detectNewGoals(
  prevEvents: ReadonlyArray<SportEvent>,
  nextEvents: ReadonlyArray<SportEvent>,
  houses: Record<HouseId, HouseConfig>,
  nowMs: number = Date.now()
): GoalCelebrationPayload[] {
  const prevById = new Map<string, SportEvent>();
  for (const ev of prevEvents || []) {
    prevById.set(ev.id, ev);
  }

  const goals: GoalCelebrationPayload[] = [];
  for (const nextEv of nextEvents || []) {
    if (nextEv.status !== 'LIVE' || !nextEv.liveMatch) continue;
    if (resolveEffectiveEventType(nextEv) !== 'team') continue;

    const prevEv = prevById.get(nextEv.id);
    if (!prevEv || prevEv.status !== 'LIVE' || !prevEv.liveMatch) continue;

    const prevLm = prevEv.liveMatch;
    const nextLm = nextEv.liveMatch;
    const prevGoalIds = new Set(
      (prevLm.timeline || []).filter((item) => item.type === 'goal').map((item) => item.id)
    );
    const newGoalItems = (nextLm.timeline || []).filter(
      (item) => item.type === 'goal' && !prevGoalIds.has(item.id)
    );

    if (newGoalItems.length > 0) {
      const latestGoal = newGoalItems[newGoalItems.length - 1];
      const houseId = latestGoal.side === 'A' ? nextLm.teamAHouse : nextLm.teamBHouse;
      const norm = normalizeTimelinePlayer(latestGoal.playerName, latestGoal.chestNo, 'goal');
      goals.push({
        eventId: nextEv.id,
        eventName: nextEv.name,
        houseId,
        houseName: houses[houseId]?.name || houseId,
        playerName: norm.name === 'Goal' && !norm.chestNo ? '' : norm.name,
        chestNo: norm.chestNo,
        minute: Math.max(0, Math.floor(Number(latestGoal.minute) || 0)),
        scoreA: nextLm.scoreA,
        scoreB: nextLm.scoreB,
      });
      continue;
    }

    const isGoalSport = detectLiveMatchSportProfile(nextEv.name).id === 'football';
    const scoreAIncreased = nextLm.scoreA > prevLm.scoreA;
    const scoreBIncreased = nextLm.scoreB > prevLm.scoreB;
    if (isGoalSport && (scoreAIncreased || scoreBIncreased)) {
      const side: 'A' | 'B' = scoreAIncreased ? 'A' : 'B';
      const houseId = side === 'A' ? nextLm.teamAHouse : nextLm.teamBHouse;
      const minute = computeMatchMinute(nextLm, nowMs);
      goals.push({
        eventId: nextEv.id,
        eventName: nextEv.name,
        houseId,
        houseName: houses[houseId]?.name || houseId,
        playerName: '',
        chestNo: '',
        minute: minute > 0 ? minute : null,
        scoreA: nextLm.scoreA,
        scoreB: nextLm.scoreB,
      });
    }
  }
  return goals;
}

export function resolveCarouselIndex(
  items: ReadonlyArray<{ id: string }>,
  currentIndex: number,
  currentId: string,
  preserveById: boolean
): { index: number; id: string } {
  if (!items || items.length === 0) {
    return { index: 0, id: '' };
  }
  if (preserveById && currentId) {
    const matchedIdx = items.findIndex((item) => item.id === currentId);
    if (matchedIdx !== -1) {
      return { index: matchedIdx, id: currentId };
    }
  }
  const len = items.length;
  const wrapped = ((currentIndex % len) + len) % len;
  return { index: wrapped, id: items[wrapped].id };
}

export function isFieldEvent(
  ev: Pick<SportEvent, 'name' | 'type'> | null | undefined
): boolean {
  if (!ev) return false;
  const effective = resolveEffectiveEventType(ev);
  if (effective !== 'individual') return false;
  const name = String(ev.name || '');
  if (/throwball/i.test(name)) return false;
  return /(throw|javelin|shot\s*put|discus|jump|vault|hammer)/i.test(name);
}

export function isIndoorBoardEvent(
  ev: Pick<SportEvent, 'name' | 'type'> | null | undefined
): boolean {
  if (!ev) return false;
  const effective = resolveEffectiveEventType(ev);
  if (effective !== 'individual') return false;
  const name = String(ev.name || '');
  return /\b(chess|carroms?)\b/i.test(name);
}

export function isTimedTrackEvent(
  ev: Pick<SportEvent, 'name' | 'type'> | null | undefined
): boolean {
  if (!ev) return false;
  const effective = resolveEffectiveEventType(ev);
  if (effective === 'team' || effective === 'cricket') return false;
  if (isFieldEvent(ev) || isIndoorBoardEvent(ev)) return false;
  const name = String(ev.name || '');
  return /(\b\d+\s*(?:m|meters?|metres?|km)\b|\b\d+\s*x\s*\d+|sprint|run|race|hurdles?|relay|dash|track|walk|marathon|steeple|cross\s*country|swim|cycling)/i.test(
    name
  );
}

export const QUICK_CATEGORY_PRESETS = [
  'Sub-Junior Boys',
  'Sub-Junior Girls',
  'Junior Boys',
  'Junior Girls',
  'Senior Boys',
  'Senior Girls',
  'Open / Mixed',
] as const;

export interface QuickEventPreset {
  name: string;
  type: CanonicalEventType;
  venue: string;
}

export interface QuickEventPresetGroup {
  id: 'track' | 'field' | 'team' | 'indoor';
  label: string;
  items: QuickEventPreset[];
}

export const QUICK_EVENT_PRESET_GROUPS: QuickEventPresetGroup[] = [
  {
    id: 'track',
    label: 'Track',
    items: [
      { name: '100m Sprint', type: 'individual', venue: 'Main Track' },
      { name: '200m Sprint', type: 'individual', venue: 'Main Track' },
      { name: '400m Run', type: 'individual', venue: 'Main Track' },
      { name: '800m Run', type: 'individual', venue: 'Main Track' },
      { name: '1500m Run', type: 'individual', venue: 'Main Track' },
      { name: '4x100m Relay', type: 'group', venue: 'Main Track' },
    ],
  },
  {
    id: 'field',
    label: 'Field',
    items: [
      { name: 'Long Jump', type: 'individual', venue: 'Jumping Pit' },
      { name: 'High Jump', type: 'individual', venue: 'Jumping Pit' },
      { name: 'Shot Put', type: 'individual', venue: 'Throwing Sector' },
      { name: 'Discus Throw', type: 'individual', venue: 'Throwing Sector' },
      { name: 'Javelin Throw', type: 'individual', venue: 'Throwing Sector' },
    ],
  },
  {
    id: 'team',
    label: 'Team / Outdoor',
    items: [
      { name: 'Football', type: 'team', venue: 'Football Turf' },
      { name: 'Cricket', type: 'cricket', venue: 'Cricket Ground' },
      { name: 'Volleyball', type: 'team', venue: 'Volleyball Court' },
      { name: 'Tug of War', type: 'team', venue: 'Main Ground' },
    ],
  },
  {
    id: 'indoor',
    label: 'Indoor Games',
    items: [
      { name: 'Chess', type: 'individual', venue: 'Indoor Hall' },
      { name: 'Table Tennis', type: 'team', venue: 'Indoor Hall' },
      { name: 'Badminton', type: 'team', venue: 'Indoor Hall' },
      { name: 'Carroms', type: 'individual', venue: 'Indoor Hall' },
    ],
  },
];

export function findQuickEventPreset(eventName: string | undefined): QuickEventPreset | null {
  const norm = String(eventName || '').trim().toLowerCase();
  if (!norm) return null;
  for (const group of QUICK_EVENT_PRESET_GROUPS) {
    const match = group.items.find((item) => item.name.toLowerCase() === norm);
    if (match) return match;
  }
  return null;
}

export function formatFieldMetric(raw: string | undefined): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    return `${trimmed}m`;
  }
  const spacedMeters = trimmed.match(/^(\d+(?:\.\d+)?)\s*m$/i);
  if (spacedMeters) {
    return `${spacedMeters[1]}m`;
  }
  return trimmed;
}

export type FieldMeasurementKind = 'height' | 'jump_distance' | 'throw_distance';

export interface FieldMeasurementConfig {
  kind: FieldMeasurementKind;
  label: 'Height (m)' | 'Distance (m)';
  shortLabel: 'Height' | 'Distance';
  maxMeters: number;
  defaultMeters: number;
  example: string;
}

export function getFieldMeasurementConfig(
  ev: Pick<SportEvent, 'name' | 'type'> | string | null | undefined
): FieldMeasurementConfig {
  const name = typeof ev === 'string' ? ev : String(ev?.name || '');
  if (/(high\s*jump|pole\s*vault|\bvault\b)/i.test(name)) {
    return {
      kind: 'height',
      label: 'Height (m)',
      shortLabel: 'Height',
      maxMeters: 5,
      defaultMeters: 1,
      example: '1.54m',
    };
  }
  if (/(long\s*jump|triple\s*jump|broad\s*jump|standing\s*jump|\bjump\b)/i.test(name)) {
    return {
      kind: 'jump_distance',
      label: 'Distance (m)',
      shortLabel: 'Distance',
      maxMeters: 15,
      defaultMeters: 4,
      example: '5.62m',
    };
  }
  return {
    kind: 'throw_distance',
    label: 'Distance (m)',
    shortLabel: 'Distance',
    maxMeters: 65,
    defaultMeters: /shot\s*put/i.test(name) ? 8 : 20,
    example: /shot\s*put/i.test(name) ? '9.45m' : '34.50m',
  };
}

export interface ParsedFieldWheelValue {
  meters: number;
  centimeters: number;
  isFoul: boolean;
  hasValue: boolean;
}

export function parseFieldWheelValue(
  raw: string | undefined,
  maxMeters: number,
  defaultMeters: number = 0
): ParsedFieldWheelValue {
  const safeMax = Math.max(0, Math.floor(Number(maxMeters) || 0));
  const safeDefault = Math.max(0, Math.min(safeMax, Math.floor(Number(defaultMeters) || 0)));
  const trimmed = String(raw || '').trim();
  if (!trimmed) {
    return { meters: safeDefault, centimeters: 0, isFoul: false, hasValue: false };
  }
  if (/^(f|foul|x|nm|dns|pass|-)$/i.test(trimmed)) {
    return { meters: safeDefault, centimeters: 0, isFoul: true, hasValue: false };
  }
  const numMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*m?$/i);
  if (!numMatch) {
    return { meters: safeDefault, centimeters: 0, isFoul: false, hasValue: false };
  }
  const num = Number(numMatch[1]);
  if (!Number.isFinite(num) || num < 0) {
    return { meters: safeDefault, centimeters: 0, isFoul: false, hasValue: false };
  }
  const totalCm = Math.round(num * 100);
  const rawMeters = Math.floor(totalCm / 100);
  const rawCm = totalCm % 100;
  if (rawMeters > safeMax) {
    return { meters: safeMax, centimeters: 99, isFoul: false, hasValue: true };
  }
  return {
    meters: Math.max(0, rawMeters),
    centimeters: Math.max(0, Math.min(99, rawCm)),
    isFoul: false,
    hasValue: true,
  };
}

export function formatFieldWheelValue(meters: number, centimeters: number): string {
  const safeM = Math.max(0, Math.floor(Number(meters) || 0));
  const safeCm = Math.max(0, Math.min(99, Math.floor(Number(centimeters) || 0)));
  return `${safeM}.${String(safeCm).padStart(2, '0')}m`;
}

export interface ParsedFieldAttempt {
  valid: boolean;
  value: number | null;
  isFoul: boolean;
}

export function parseFieldAttempt(raw: string | undefined): ParsedFieldAttempt {
  const trimmed = String(raw || '').trim();
  if (!trimmed) {
    return { valid: false, value: null, isFoul: false };
  }
  if (/^(f|foul|x|nm|dns|pass|-)$/i.test(trimmed)) {
    return { valid: false, value: null, isFoul: true };
  }
  const numMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*m?$/i);
  if (!numMatch) {
    return { valid: false, value: null, isFoul: false };
  }
  const value = Number(numMatch[1]);
  if (!Number.isFinite(value) || value <= 0) {
    return { valid: false, value: null, isFoul: false };
  }
  return { valid: true, value, isFoul: false };
}

export interface BestFieldAttemptResult {
  best: number | null;
  formatted: string;
  validMarksDesc: number[];
  allFouls: boolean;
}

export function computeBestFieldAttempt(
  attempts: ReadonlyArray<string | undefined>
): BestFieldAttemptResult {
  const parsed = (attempts || []).map((a) => parseFieldAttempt(a));
  const validMarksDesc = parsed
    .filter((p): p is { valid: true; value: number; isFoul: false } => p.valid && p.value !== null)
    .map((p) => p.value)
    .sort((a, b) => b - a);

  const hasAnyFoul = parsed.some((p) => p.isFoul);
  if (validMarksDesc.length === 0) {
    return {
      best: null,
      formatted: '',
      validMarksDesc: [],
      allFouls: hasAnyFoul,
    };
  }
  const best = validMarksDesc[0];
  return {
    best,
    formatted: `${best.toFixed(2)}m`,
    validMarksDesc,
    allFouls: false,
  };
}

export interface FieldTrialRow {
  chestNo: string;
  name?: string;
  house?: HouseId | '';
  attempts: [string, string, string];
}

export interface RankedFieldTrial {
  place: number;
  chestNo: string;
  name: string;
  house: HouseId | '';
  best: number;
  metric: string;
  validMarksDesc: number[];
}

export function rankFieldTrials(
  rows: ReadonlyArray<FieldTrialRow>,
  students: ReadonlyArray<StudentRecord>
): RankedFieldTrial[] {
  const candidates: Array<Omit<RankedFieldTrial, 'place'>> = [];

  for (const row of rows || []) {
    const chestClean = String(row.chestNo || '').trim().replace(/^#+/, '').trim();
    const matchedStudent = chestClean
      ? (students || []).find((s) => String(s.chestNo || '').trim().toLowerCase() === chestClean.toLowerCase())
      : undefined;

    const resolvedName = String(matchedStudent?.name || row.name || '').trim();
    const resolvedHouse: HouseId | '' = matchedStudent?.house || row.house || '';
    if (!chestClean && !resolvedName) continue;

    const bestResult = computeBestFieldAttempt(row.attempts || ['', '', '']);
    if (bestResult.best === null) continue;

    candidates.push({
      chestNo: matchedStudent?.chestNo || chestClean,
      name: resolvedName,
      house: resolvedHouse,
      best: bestResult.best,
      metric: bestResult.formatted,
      validMarksDesc: bestResult.validMarksDesc,
    });
  }

  candidates.sort((a, b) => {
    const maxLen = Math.max(a.validMarksDesc.length, b.validMarksDesc.length);
    for (let i = 0; i < maxLen; i += 1) {
      const av = a.validMarksDesc[i] ?? -1;
      const bv = b.validMarksDesc[i] ?? -1;
      if (bv !== av) return bv - av;
    }
    return String(a.chestNo || a.name).localeCompare(String(b.chestNo || b.name), undefined, {
      numeric: true,
    });
  });

  return candidates.map((item, idx) => ({
    ...item,
    place: idx + 1,
  }));
}

export type SessionRole = 'public' | 'official' | 'admin' | 'master';
export type SessionView = 'home' | 'scoring' | 'admin' | 'tv' | 'master';

export interface PersistedSessionState {
  schoolCode: string;
  role: SessionRole;
  view: SessionView;
  selectedEventId: string;
}

export function sanitizePersistedSession(raw: unknown): PersistedSessionState | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const schoolCode = normalizeSchoolCode(String(obj.schoolCode || ''));
  const rawRole = String(obj.role || 'public').trim().toLowerCase();
  const role: SessionRole =
    rawRole === 'admin' || rawRole === 'official' || rawRole === 'master' ? rawRole : 'public';
  const rawView = String(obj.view || 'home').trim().toLowerCase();
  const view: SessionView =
    rawView === 'scoring' || rawView === 'admin' || rawView === 'tv' || rawView === 'master'
      ? rawView
      : 'home';
  const selectedEventId = String(obj.selectedEventId || '').trim();

  if (!schoolCode && role !== 'master') return null;
  return { schoolCode, role, view, selectedEventId };
}

export function resolveRestoredSession(
  saved: PersistedSessionState | null | undefined,
  targetSchoolCode: string,
  availableEventIds: ReadonlyArray<string>
): { role: SessionRole; view: SessionView; selectedEventId: string } {
  const defaultEventId = availableEventIds[0] || '';
  const targetNorm = normalizeSchoolCode(targetSchoolCode);
  if (!saved || !targetNorm || normalizeSchoolCode(saved.schoolCode) !== targetNorm) {
    return { role: 'public', view: 'home', selectedEventId: defaultEventId };
  }

  const role: SessionRole = saved.role === 'master' ? 'public' : saved.role;
  let view: SessionView = saved.view;
  if (view === 'admin' && role !== 'admin') {
    view = 'home';
  } else if (view === 'scoring' && role !== 'official' && role !== 'admin') {
    view = 'home';
  } else if (view === 'master') {
    view = 'home';
  }

  const selectedEventId =
    saved.selectedEventId && availableEventIds.includes(saved.selectedEventId)
      ? saved.selectedEventId
      : defaultEventId;

  return { role, view, selectedEventId };
}

export function isEventCompletedStatus(status: string | undefined | null): boolean {
  const norm = String(status || '').trim().toUpperCase();
  return norm === 'FINISHED' || norm === 'COMPLETED';
}

export function createReopenedEvent(
  ev: SportEvent,
  targetStatus: 'LIVE' | 'UPCOMING',
  now: number = Date.now()
): SportEvent {
  const effective = resolveEffectiveEventType(ev);
  if (targetStatus === 'UPCOMING') {
    return {
      ...ev,
      status: 'UPCOMING',
      winners: [],
      ...(ev.liveMatch
        ? {
            liveMatch: {
              ...ev.liveMatch,
              clockRunning: false,
              clockStartedAt: null,
              periodLabel: 'Scheduled',
            },
          }
        : {}),
      updatedAt: now,
    };
  }

  // targetStatus === 'LIVE'
  const baseLiveMatch = ev.liveMatch
    ? {
        ...ev.liveMatch,
        periodLabel:
          ev.liveMatch.periodLabel && ev.liveMatch.periodLabel.toLowerCase() !== 'final' && ev.liveMatch.periodLabel.toLowerCase() !== 'scheduled'
            ? ev.liveMatch.periodLabel
            : effective === 'cricket'
              ? 'Live Cricket'
              : 'Live Match',
      }
    : effective === 'team' || effective === 'cricket'
      ? {
          teamAHouse: 'red' as HouseId,
          teamBHouse: 'blue' as HouseId,
          scoreA: 0,
          scoreB: 0,
          ...(effective === 'cricket' ? { wicketsA: 0, wicketsB: 0, oversA: '0.0', oversB: '0.0' } : {}),
          periodLabel: effective === 'cricket' ? 'Live Cricket' : 'Live Match',
        }
      : undefined;

  return {
    ...ev,
    status: 'LIVE',
    winners: [],
    ...(baseLiveMatch ? { liveMatch: baseLiveMatch } : {}),
    updatedAt: now,
  };
}


