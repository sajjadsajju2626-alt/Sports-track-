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
    /(football|soccer|futsal|kabaddi|basketball|volleyball|badminton|tug\s*of\s*war|kho[- ]?kho|hockey|handball|throwball)/i.test(
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
  tone: 'minus' | 'primary' | 'accent';
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
      { delta: 1, label: '+1', tone: 'primary' },
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
            ? { clockElapsedMs: 0, clockStartedAt: null, clockRunning: false, timeline: [] }
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
            ? { clockElapsedMs: 0, clockStartedAt: null, clockRunning: false, timeline: [] }
            : {}),
          periodLabel: 'Scheduled',
        },
    updatedAt: now,
  };
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

export function formatLiveMatchStatusDisplay(
  liveMatch: Pick<LiveMatchState, 'periodLabel' | 'clockElapsedMs' | 'clockStartedAt' | 'clockRunning'> | null | undefined,
  nowMs: number = Date.now()
): string {
  const rawPeriod = String(liveMatch?.periodLabel || '').trim();
  const isDefault = !rawPeriod || ['live match', 'scheduled'].includes(rawPeriod.toLowerCase());
  const elapsedMs = computeMatchClockElapsedMs(liveMatch, nowMs);
  const hasClock = Boolean(liveMatch?.clockRunning) || elapsedMs > 0;
  const minute = computeMatchMinute(liveMatch, nowMs);

  if (hasClock) {
    if (isDefault) return `Live · ${minute}'`;
    if (rawPeriod.includes("'")) return rawPeriod;
    return `${rawPeriod} · ${minute}'`;
  }
  return rawPeriod || 'Live Match';
}

export function formatTimelineItemLabel(item: MatchTimelineEvent): string {
  const icon = item.type === 'goal' ? '⚽' : item.type === 'yellow' ? '🟨' : '🟥';
  const rawName = String(item.playerName || '').trim();
  const cleanName = rawName || (item.type === 'goal' ? 'Goal' : 'Team / Unknown');
  const cleanChest = String(item.chestNo || '').trim();
  const who = cleanChest ? `${cleanName} (#${cleanChest})` : cleanName;
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
      const rawName = String(latestGoal.playerName || '').trim();
      const chestNo = String(latestGoal.chestNo || '').trim();
      goals.push({
        eventId: nextEv.id,
        eventName: nextEv.name,
        houseId,
        houseName: houses[houseId]?.name || houseId,
        playerName: rawName === 'Goal' && !chestNo ? '' : rawName || 'Team / Unknown',
        chestNo,
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
