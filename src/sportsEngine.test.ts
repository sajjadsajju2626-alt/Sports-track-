import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAddedTimeChange,
  applyMatchClockCommand,
  applyMatchDurationChange,
  applyTeamScoreDelta,
  buildInviteMessage,
  buildPublicShareUrl,
  computeHousePointBreakdown,
  computeHouseStandings,
  computeMatchClockElapsedMs,
  computeMatchMinute,
  computeTopAthletes,
  createRevertedUpcomingEvent,
  DEFAULT_POINT_RULES,
  detectLiveMatchSportProfile,
  detectNewGoals,
  evaluateMatchThresholdAlert,
  formatCricketScore,
  formatLiveMatchStatusDisplay,
  formatMatchClockMMSS,
  formatStopwatch,
  formatTimelineItemLabel,
  generateCsvTemplate,
  getEditablePeriodValue,
  getEventPointRules,
  getEventTypeLabel,
  getMatchDurationMins,
  incrementCricketOvers,
  inferDivision,
  isCricketEvent,
  isHouseGroupPodiumEvent,
  isRelayEvent,
  isStudentRegisteredForEvent,
  MATCH_DURATION_PRESETS,
  normalizeSchoolCode,
  parseStudentCsv,
  resolveCarouselIndex,
  resolveEffectiveEventType,
  validateWorkspacePin,
  type SportsDayState,
} from './sportsEngine';

function createBaseState(): SportsDayState {
  return {
    schoolCode: 'OAK26',
    schoolName: 'Oakridge High Sports Meet',
    tickerMessage: 'Welcome to Annual Sports Day',
    houses: {
      red: { id: 'red', name: 'Red House', color: '#DC2626' },
      blue: { id: 'blue', name: 'Blue House', color: '#2563EB' },
      green: { id: 'green', name: 'Green House', color: '#16A34A' },
      yellow: { id: 'yellow', name: 'Yellow House', color: '#CA8A04' },
    },
    pointRules: { ...DEFAULT_POINT_RULES },
    events: [],
    students: [],
    lastPublishedAt: 0,
    lastPublishedTitle: '',
  };
}

test('normalizeSchoolCode uppercases and strips invalid characters', () => {
  assert.equal(normalizeSchoolCode('  xavier 26! '), 'XAVIER26');
  assert.equal(normalizeSchoolCode('st-joseph_2026'), 'ST-JOSEPH_2026');
});

test('validateWorkspacePin resolves master, admin, and official PINs accurately', () => {
  const pins = { masterPin: '999999', adminPin: '4321', officialPin: '2222' };
  assert.equal(validateWorkspacePin('999999', pins), 'master');
  assert.equal(validateWorkspacePin('4321', pins), 'admin');
  assert.equal(validateWorkspacePin('2222', pins), 'official');
  assert.equal(validateWorkspacePin('1111', pins), null);
  assert.equal(validateWorkspacePin('', pins), null);
});

test('buildInviteMessage creates WhatsApp text without URL parameters', () => {
  const msg = buildInviteMessage({
    name: 'St. Joseph School',
    code: 'STJOSEPH',
    adminPin: '4545',
    officialPin: '1212',
  });
  assert.ok(msg.includes('STJOSEPH'));
  assert.ok(msg.includes('4545'));
  assert.ok(msg.includes('1212'));
  assert.ok(!msg.includes('?'));
});

test('generateCsvTemplate includes Items header and 2 quoted sample rows', () => {
  const csv = generateCsvTemplate();
  assert.equal(
    csv,
    [
      'ChestNo,Name,House,Category,Items',
      '101,Aarav Sharma,Red,Junior Boys,"100m Sprint, Long Jump"',
      '102,Priya Nair,Blue,Senior Girls,"Shot Put, High Jump"',
    ].join('\n')
  );
  const parsed = parseStudentCsv(csv);
  assert.equal(parsed.length, 2);
  assert.deepEqual(parsed[0], {
    chestNo: '101',
    name: 'Aarav Sharma',
    house: 'red',
    category: 'Junior Boys',
    items: ['100m Sprint', 'Long Jump'],
  });
  assert.deepEqual(parsed[1], {
    chestNo: '102',
    name: 'Priya Nair',
    house: 'blue',
    category: 'Senior Girls',
    items: ['Shot Put', 'High Jump'],
  });
});

test('CSV parser parses quoted Items, skips header, and deduplicates chest numbers', () => {
  const csv = `
ChestNo, Name, House, Category, Items
101, Aarav Sharma, Red, Junior Boys, "100m Sprint, Long Jump"
102, Priya Nair, Blue, Senior Girls, Shot Put
101, Duplicate Student, Green, Junior Boys, 200m
103, Invalid House, Purple, Open, 100m
`;
  const parsed = parseStudentCsv(csv);
  assert.equal(parsed.length, 2);
  assert.deepEqual(parsed[0].items, ['100m Sprint', 'Long Jump']);
  assert.deepEqual(parsed[1].items, ['Shot Put']);
});

test('isStudentRegisteredForEvent checks Items list and handles stage suffixes', () => {
  const student = { items: ['100m Sprint', 'Long Jump'] };
  assert.equal(isStudentRegisteredForEvent(student, '100m Sprint'), true);
  assert.equal(isStudentRegisteredForEvent(student, '100m Sprint Final'), true);
  assert.equal(isStudentRegisteredForEvent(student, 'Shot Put'), false);
  assert.equal(isStudentRegisteredForEvent({ items: [] }, 'Shot Put'), null);
});

test('computeHouseStandings calculates individual + team points and ranks ties by gold medals', () => {
  const state = createBaseState();
  state.events = [
    {
      id: 'ev1',
      name: '100m Sprint',
      category: 'Senior Boys',
      type: 'individual',
      venue: 'Track Lane 1',
      status: 'FINISHED',
      updatedAt: 100,
      winners: [
        { place: 1, chestNo: '101', name: 'Aarav', house: 'red', metric: '11.4s' },
        { place: 2, chestNo: '202', name: 'Rohan', house: 'blue', metric: '11.8s' },
        { place: 3, chestNo: '303', name: 'Kabir', house: 'green', metric: '12.1s' },
      ],
    },
    {
      id: 'ev2',
      name: 'Football Final',
      category: 'Senior Boys',
      type: 'team',
      venue: 'Main Turf',
      status: 'FINISHED',
      updatedAt: 200,
      winners: [
        { place: 1, chestNo: '', name: 'Blue House XI', house: 'blue', metric: '2-1' },
        { place: 2, chestNo: '', name: 'Red House XI', house: 'red', metric: '1-2' },
      ],
    },
  ];

  const standings = computeHouseStandings(state);
  assert.equal(standings[0].id, 'blue');
  assert.equal(standings[0].points, 13);
  assert.equal(standings[1].id, 'red');
  assert.equal(standings[1].points, 11);
  assert.equal(standings[2].id, 'green');
  assert.equal(standings[2].points, 1);
  assert.equal(standings[3].id, 'yellow');
  assert.equal(standings[3].points, 0);
});

test('computeTopAthletes aggregates individual events by chest number and separates boys/girls divisions', () => {
  const state = createBaseState();
  state.events = [
    {
      id: 'e1',
      name: '100m Sprint',
      category: 'Junior Boys',
      type: 'individual',
      venue: 'Track',
      status: 'FINISHED',
      updatedAt: 1,
      winners: [
        { place: 1, chestNo: '101', name: 'Aarav', house: 'red', metric: '11.5s' },
      ],
    },
    {
      id: 'e2',
      name: 'Long Jump',
      category: 'Junior Boys',
      type: 'individual',
      venue: 'Pit A',
      status: 'FINISHED',
      updatedAt: 2,
      winners: [
        { place: 2, chestNo: '101', name: 'Aarav', house: 'red', metric: '5.10m' },
      ],
    },
    {
      id: 'e3',
      name: '100m Sprint',
      category: 'Senior Girls',
      type: 'individual',
      venue: 'Track',
      status: 'FINISHED',
      updatedAt: 3,
      winners: [
        { place: 1, chestNo: '205', name: 'Meera', house: 'green', metric: '12.6s' },
      ],
    },
  ];

  const athletes = computeTopAthletes(state);
  assert.equal(athletes.length, 2);
  assert.equal(athletes[0].name, 'Aarav');
  assert.equal(athletes[0].points, 8);
  assert.equal(athletes[0].division, 'boys');
  assert.equal(athletes[1].name, 'Meera');
  assert.equal(athletes[1].points, 5);
  assert.equal(athletes[1].division, 'girls');
  assert.equal(inferDivision('Sub-Junior Girls'), 'girls');
});

test('formatStopwatch formats milliseconds into MM:SS.CC', () => {
  assert.equal(formatStopwatch(0), '00:00.00');
  assert.equal(formatStopwatch(12450), '00:12.45');
  assert.equal(formatStopwatch(65120), '01:05.12');
});

test('computeHousePointBreakdown ranks contributing finished events by points descending and aggregates multi-place entries', () => {
  const state = createBaseState();
  state.events = [
    {
      id: 'ev1',
      name: '100m Sprint',
      category: 'Senior Boys',
      type: 'individual',
      venue: 'Main Track',
      status: 'FINISHED',
      updatedAt: 100,
      winners: [
        { place: 1, chestNo: '101', name: 'Aarav', house: 'red', metric: '11.4s' },
        { place: 2, chestNo: '202', name: 'Rohan', house: 'blue', metric: '11.8s' },
        { place: 3, chestNo: '109', name: 'Vivaan', house: 'red', metric: '12.0s' },
      ],
    },
    {
      id: 'ev2',
      name: 'Football Final',
      category: 'Senior Boys',
      type: 'team',
      venue: 'Main Turf',
      status: 'FINISHED',
      updatedAt: 200,
      winners: [
        { place: 1, chestNo: '', name: 'Blue House XI', house: 'blue', metric: '2-1' },
        { place: 2, chestNo: '', name: 'Red House XI', house: 'red', metric: '1-2' },
      ],
    },
    {
      id: 'ev3',
      name: 'Long Jump',
      category: 'Junior Boys',
      type: 'individual',
      venue: 'Sand Pit A',
      status: 'LIVE',
      updatedAt: 300,
      winners: [
        { place: 1, chestNo: '111', name: 'Live Athlete', house: 'red', metric: '5.5m' },
      ],
    },
  ];

  // Red: 100m Sprint (1st=5 + 3rd=1 -> 6 pts) ties Football Final (2nd=6 pts), gold tiebreaker puts 100m Sprint first
  const redBreakdown = computeHousePointBreakdown(state, 'red');
  assert.equal(redBreakdown.length, 2);
  assert.equal(redBreakdown[0].eventName, '100m Sprint');
  assert.equal(redBreakdown[0].points, 6);
  assert.equal(redBreakdown[0].sharePct, 50);
  assert.equal(redBreakdown[0].entries.length, 2);
  assert.equal(redBreakdown[1].eventName, 'Football Final');
  assert.equal(redBreakdown[1].points, 6);

  // Blue: Football Final (10 pts) ranks above 100m Sprint (3 pts)
  const blueBreakdown = computeHousePointBreakdown(state, 'blue');
  assert.equal(blueBreakdown.length, 2);
  assert.equal(blueBreakdown[0].eventName, 'Football Final');
  assert.equal(blueBreakdown[0].points, 10);
  assert.equal(blueBreakdown[0].sharePct, 77);
  assert.equal(blueBreakdown[1].eventName, '100m Sprint');
  assert.equal(blueBreakdown[1].points, 3);
  assert.equal(blueBreakdown[1].sharePct, 23);

  // Yellow: no points
  assert.deepEqual(computeHousePointBreakdown(state, 'yellow'), []);
});

test('buildPublicShareUrl constructs clean public scoreboard URL with normalized school code', () => {
  assert.equal(
    buildPublicShareUrl('https://sports.example.com/?autostart=1#top', ' demofest '),
    'https://sports.example.com/?code=DEMOFEST'
  );
  assert.equal(
    buildPublicShareUrl('https://sports.example.com/meet/?foo=bar', 'stjoseph'),
    'https://sports.example.com/meet/?code=STJOSEPH'
  );
  assert.equal(
    buildPublicShareUrl('https://sports.example.com/?code=OLD', ''),
    'https://sports.example.com/'
  );
});

test('getEditablePeriodValue clears default Scheduled/Live Match labels and preserves custom periods', () => {
  assert.equal(getEditablePeriodValue(''), '');
  assert.equal(getEditablePeriodValue('Live Match'), '');
  assert.equal(getEditablePeriodValue('Scheduled'), '');
  assert.equal(getEditablePeriodValue("2nd Half · 65'"), "2nd Half · 65'");
});

test('createRevertedUpcomingEvent resets status to UPCOMING, clears scores to 0-0, and resets periodLabel', () => {
  const reverted = createRevertedUpcomingEvent(
    {
      id: 'ev-team',
      name: 'Football Final',
      category: 'Senior Boys',
      type: 'team',
      venue: 'Central Turf',
      status: 'LIVE',
      winners: [{ place: 1, chestNo: '', name: 'Red House', house: 'red', metric: '3-2' }],
      liveMatch: {
        teamAHouse: 'red',
        teamBHouse: 'blue',
        scoreA: 3,
        scoreB: 2,
        periodLabel: "2nd Half · 68'",
      },
      updatedAt: 100,
    },
    999
  );
  assert.equal(reverted.status, 'UPCOMING');
  assert.deepEqual(reverted.winners, []);
  assert.equal(reverted.liveMatch?.scoreA, 0);
  assert.equal(reverted.liveMatch?.scoreB, 0);
  assert.equal(reverted.liveMatch?.periodLabel, 'Scheduled');
  assert.equal(reverted.liveMatch?.teamAHouse, 'red');
  assert.equal(reverted.liveMatch?.teamBHouse, 'blue');
  assert.equal(reverted.updatedAt, 999);
});

test('resolveCarouselIndex keeps active live match anchored during score updates and wraps cleanly on navigation', () => {
  const liveMatches = [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }];
  // Score update arrives for m2 while m2 is displayed -> keeps m2 visible even if list order shifts
  const reordered = [{ id: 'm3' }, { id: 'm2' }, { id: 'm1' }];
  assert.deepEqual(resolveCarouselIndex(reordered, 1, 'm2', true), { index: 1, id: 'm2' });
  assert.deepEqual(resolveCarouselIndex([{ id: 'm2' }, { id: 'm1' }], 1, 'm2', true), { index: 0, id: 'm2' });

  // Manual navigation wraps cleanly
  assert.deepEqual(resolveCarouselIndex(liveMatches, -1, 'm1', false), { index: 2, id: 'm3' });
  assert.deepEqual(resolveCarouselIndex(liveMatches, 3, 'm3', false), { index: 0, id: 'm1' });
  assert.deepEqual(resolveCarouselIndex([], 0, 'm1', true), { index: 0, id: '' });
});

test('resolveEffectiveEventType and getEventTypeLabel support all 4 event types with auto-detection', () => {
  assert.equal(resolveEffectiveEventType({ name: '4 x 100 meters Relay', type: 'team' }), 'group');
  assert.equal(resolveEffectiveEventType({ name: 'March Past Parade', type: 'individual' }), 'group');
  assert.equal(resolveEffectiveEventType({ name: 'Three-Legged Race', type: 'group' }), 'group');
  assert.equal(resolveEffectiveEventType({ name: 'Track Sprint', type: 'relay' }), 'group');
  assert.equal(resolveEffectiveEventType({ name: 'Inter-House Cricket', type: 'team' }), 'cricket');
  assert.equal(resolveEffectiveEventType({ name: 'Senior Cricket Final', type: 'cricket' }), 'cricket');
  assert.equal(resolveEffectiveEventType({ name: 'Football Final', type: 'team' }), 'team');
  assert.equal(resolveEffectiveEventType({ name: '100m Sprint', type: 'individual' }), 'individual');

  assert.equal(isRelayEvent({ name: '4 x 100 meters Relay', type: 'team' }), true);
  assert.equal(isHouseGroupPodiumEvent({ name: 'March Past', type: 'team' }), true);
  assert.equal(isCricketEvent({ name: 'Boys Cricket Semi', type: 'team' }), true);

  assert.equal(getEventTypeLabel({ name: '4 x 100 meters Relay', type: 'team' }), 'House / Group Podium');
  assert.equal(getEventTypeLabel({ name: 'March Past', type: 'group' }), 'House / Group Podium');
  assert.equal(getEventTypeLabel({ name: 'Inter-House Cricket', type: 'cricket' }), 'Cricket Match');
  assert.equal(getEventTypeLabel({ name: 'Football Final', type: 'team' }), '1 vs 1 Live Match');
  assert.equal(getEventTypeLabel({ name: '100m Sprint', type: 'individual' }), 'Individual Event');
});

test('House / Group Podium & Cricket award House points without inflating Individual Champion scores', () => {
  const state = createBaseState();
  state.events = [
    {
      id: 'ev-ind',
      name: '100m Sprint',
      category: 'Senior Boys',
      type: 'individual',
      venue: 'Main Track',
      status: 'FINISHED',
      updatedAt: 100,
      winners: [
        { place: 1, chestNo: '101', name: 'Aarav Sharma', house: 'red', metric: '11.40s' },
      ],
    },
    {
      id: 'ev-relay',
      name: '4 x 100 meters Relay',
      category: 'Senior Boys',
      type: 'group',
      venue: 'Main Track',
      status: 'FINISHED',
      updatedAt: 200,
      winners: [
        { place: 1, chestNo: '', name: 'Yellow House', house: 'yellow', metric: '44.85s' },
        { place: 2, chestNo: '', name: 'Red House', house: 'red', metric: '45.20s' },
        { place: 3, chestNo: '', name: 'Blue House', house: 'blue', metric: '46.10s' },
      ],
    },
    {
      id: 'ev-march',
      name: 'March Past',
      category: 'All Houses',
      type: 'individual',
      venue: 'Ground',
      status: 'FINISHED',
      updatedAt: 250,
      winners: [
        { place: 1, chestNo: '', name: 'Green House', house: 'green', metric: '94 pts' },
      ],
    },
    {
      id: 'ev-cricket',
      name: 'Senior Boys Cricket Final',
      category: 'Senior Boys',
      type: 'cricket',
      venue: 'Oval Ground',
      status: 'FINISHED',
      updatedAt: 300,
      winners: [
        { place: 1, chestNo: '', name: 'Blue House', house: 'blue', metric: '85/3 (6.4 Ov)' },
        { place: 2, chestNo: '', name: 'Red House', house: 'red', metric: '84/4 (7.2 Ov)' },
      ],
    },
  ];

  assert.deepEqual(getEventPointRules(state, state.events[1]), [10, 6, 4]);
  assert.deepEqual(getEventPointRules(state, state.events[3]), [10, 6, 4]);

  const standings = computeHouseStandings(state);
  const red = standings.find((h) => h.id === 'red');
  const blue = standings.find((h) => h.id === 'blue');
  const yellow = standings.find((h) => h.id === 'yellow');
  const green = standings.find((h) => h.id === 'green');
  assert.equal(red?.points, 17); // 5 (100m) + 6 (Relay 2nd) + 6 (Cricket 2nd)
  assert.equal(blue?.points, 14); // 4 (Relay 3rd) + 10 (Cricket 1st)
  assert.equal(yellow?.points, 10); // 10 (Relay 1st)
  assert.equal(green?.points, 10); // 10 (March Past 1st)

  const athletes = computeTopAthletes(state);
  assert.equal(athletes.length, 1);
  assert.equal(athletes[0].name, 'Aarav Sharma');
  assert.equal(athletes[0].points, 5);
});

test('Cricket score formatting and ball-by-ball overs counter work cleanly', () => {
  assert.equal(formatCricketScore(84, 4, '7.2'), '84/4 (7.2 Ov)');
  assert.equal(formatCricketScore(0, 0, '0.0'), '0/0 (0.0 Ov)');
  assert.equal(formatCricketScore(120, 14, ''), '120/10');
  assert.equal(incrementCricketOvers('7.2', 1), '7.3');
  assert.equal(incrementCricketOvers('7.5', 1), '8.0');
  assert.equal(incrementCricketOvers('8.0', -1), '7.5');
  assert.equal(incrementCricketOvers('0.0', -1), '0.0');
});

test('Live match clock calculates elapsed MM:SS, match minute, and formatted live status', () => {
  const paused = {
    periodLabel: '1st Half',
    clockElapsedMs: 14 * 60_000 + 5_000,
    clockStartedAt: null,
    clockRunning: false,
  };
  assert.equal(computeMatchClockElapsedMs(paused, 9_999_999), 845_000);
  assert.equal(formatMatchClockMMSS(845_000), '14:05');
  assert.equal(computeMatchMinute(paused, 9_999_999), 15);
  assert.equal(formatLiveMatchStatusDisplay(paused, 9_999_999), '1st Half · 14:05');

  const running = {
    periodLabel: '1st Half',
    clockElapsedMs: 23 * 60_000,
    clockStartedAt: 100_000,
    clockRunning: true,
  };
  const now = 100_000 + 15_000; // 23:15 elapsed -> 24'
  assert.equal(formatMatchClockMMSS(computeMatchClockElapsedMs(running, now)), '23:15');
  assert.equal(computeMatchMinute(running, now), 24);
  assert.equal(formatLiveMatchStatusDisplay(running, now), '1st Half · 23:15');

  const idle = { periodLabel: 'Scheduled', clockElapsedMs: 0, clockStartedAt: null, clockRunning: false };
  assert.equal(computeMatchMinute(idle, now), 0);
  assert.equal(formatLiveMatchStatusDisplay(idle, now), 'Scheduled');
});

test('Match timeline formatting and real-time goal detection handle scorers, cards, and reverts', () => {
  const base = createBaseState();
  assert.equal(
    formatTimelineItemLabel({
      id: 't1',
      side: 'A',
      type: 'goal',
      chestNo: '104',
      playerName: 'Aarav',
      minute: 14,
      createdAt: 1,
    }),
    "⚽ Aarav (#104) 14'"
  );
  assert.equal(
    formatTimelineItemLabel({
      id: 't2',
      side: 'A',
      type: 'yellow',
      chestNo: '211',
      playerName: 'Rohan',
      minute: 22,
      createdAt: 2,
    }),
    "🟨 Rohan (#211) 22'"
  );
  assert.equal(
    formatTimelineItemLabel({
      id: 't3',
      side: 'B',
      type: 'red',
      chestNo: '',
      playerName: 'Team / Unknown',
      minute: 38,
      createdAt: 3,
    }),
    "🟥 Team / Unknown 38'"
  );

  const prevEv = {
    id: 'ev-fb',
    name: 'Football Final',
    category: 'Senior Boys',
    type: 'team' as const,
    venue: 'Central Turf',
    status: 'LIVE' as const,
    winners: [],
    updatedAt: 100,
    liveMatch: {
      teamAHouse: 'red' as const,
      teamBHouse: 'blue' as const,
      scoreA: 1,
      scoreB: 0,
      periodLabel: '1st Half',
      clockElapsedMs: 24 * 60_000,
      clockRunning: false,
      clockStartedAt: null,
      timeline: [
        { id: 'g1', side: 'A' as const, type: 'goal' as const, chestNo: '104', playerName: 'Aarav', minute: 14, createdAt: 10 },
      ],
    },
  };

  // Yellow card only -> no goal celebration
  const afterCard = {
    ...prevEv,
    liveMatch: {
      ...prevEv.liveMatch,
      timeline: [
        ...prevEv.liveMatch.timeline,
        { id: 'c1', side: 'B' as const, type: 'yellow' as const, chestNo: '211', playerName: 'Rohan', minute: 22, createdAt: 20 },
      ],
    },
  };
  assert.deepEqual(detectNewGoals([prevEv], [afterCard], base.houses, 500), []);

  // Logged goal -> emits full scorer metadata
  const afterGoal = {
    ...afterCard,
    liveMatch: {
      ...afterCard.liveMatch,
      scoreB: 1,
      timeline: [
        ...afterCard.liveMatch.timeline,
        { id: 'g2', side: 'B' as const, type: 'goal' as const, chestNo: '205', playerName: 'Kabir', minute: 24, createdAt: 30 },
      ],
    },
  };
  const goals = detectNewGoals([afterCard], [afterGoal], base.houses, 500);
  assert.equal(goals.length, 1);
  assert.equal(goals[0].houseName, 'Blue House');
  assert.equal(goals[0].playerName, 'Kabir');
  assert.equal(goals[0].chestNo, '205');
  assert.equal(goals[0].minute, 24);

  // Score increment via +1 without timeline entry -> still triggers celebration for scoring house
  const afterQuickPlus = {
    ...afterGoal,
    liveMatch: { ...afterGoal.liveMatch, scoreA: 2 },
  };
  const quickGoals = detectNewGoals([afterGoal], [afterQuickPlus], base.houses, 500);
  assert.equal(quickGoals.length, 1);
  assert.equal(quickGoals[0].houseName, 'Red House');
  assert.equal(quickGoals[0].playerName, '');

  // Revert clears clock & timeline
  const reverted = createRevertedUpcomingEvent(afterGoal, 999);
  assert.equal(reverted.liveMatch?.clockElapsedMs, 0);
  assert.equal(reverted.liveMatch?.clockRunning, false);
  assert.deepEqual(reverted.liveMatch?.timeline, []);
});

test('Sport-specific 1v1 Live Match profiles adapt controls, clocks, sets, and type resolution cleanly', () => {
  // Football Final resolves to 'team' even if stored type was accidentally 'cricket'
  assert.equal(resolveEffectiveEventType({ name: 'Football Final', type: 'cricket' as const }), 'team');
  assert.equal(resolveEffectiveEventType({ name: 'Boys Cricket Semi', type: 'team' as const }), 'cricket');
  assert.equal(resolveEffectiveEventType({ name: '4 x 100m Relay', type: 'team' as const }), 'group');

  const fb = detectLiveMatchSportProfile('Football Final');
  assert.equal(fb.id, 'football');
  assert.equal(fb.showClock, true);
  assert.equal(fb.showFootballControls, true);
  assert.deepEqual(
    fb.scoreButtons.map((b) => b.label),
    ['-1', '+1 Goal ⚽']
  );
  assert.equal(fb.scoreButtons[1].matchEvent, 'goal');

  const kabaddi = detectLiveMatchSportProfile('Senior Kabaddi Final');
  assert.equal(kabaddi.id, 'kabaddi');
  assert.equal(kabaddi.showClock, true);
  assert.equal(kabaddi.showFootballControls, false);
  assert.deepEqual(
    kabaddi.scoreButtons.map((b) => b.label),
    ['-1', '+1 Point', '+2 Super / All-Out']
  );

  const bball = detectLiveMatchSportProfile('Girls Basketball Match');
  assert.equal(bball.id, 'basketball');
  assert.equal(bball.showClock, true);
  assert.equal(bball.showFootballControls, false);
  assert.deepEqual(
    bball.scoreButtons.map((b) => b.label),
    ['-1', '+1', '+2', '+3']
  );
  assert.deepEqual(bball.periodPresets, ['Q1', 'Q2', 'Half Time', 'Q3', 'Q4', 'OT']);

  const vb = detectLiveMatchSportProfile('Volleyball Final');
  assert.equal(vb.id, 'set_match');
  assert.equal(vb.showClock, false);
  assert.equal(vb.showFootballControls, false);
  assert.deepEqual(vb.periodPresets, ['Set 1', 'Set 2', 'Set 3']);
  assert.deepEqual(
    vb.scoreButtons.map((b) => b.label),
    ['-1', '+1 Point']
  );

  const tug = detectLiveMatchSportProfile('Tug of War');
  assert.equal(tug.id, 'set_match');
  assert.equal(tug.showClock, false);
  assert.deepEqual(tug.periodPresets, ['Round 1', 'Round 2', 'Round 3']);

  // Non-goal sports (Volleyball, Kabaddi, Basketball) should NOT emit Football GOAL! overlays on point taps
  const base = createBaseState();
  const vbPrev = {
    id: 'ev-vb',
    name: 'Volleyball Final',
    category: 'Senior Girls',
    type: 'team' as const,
    venue: 'Court 1',
    status: 'LIVE' as const,
    winners: [],
    updatedAt: 100,
    liveMatch: { teamAHouse: 'green' as const, teamBHouse: 'yellow' as const, scoreA: 10, scoreB: 9, periodLabel: 'Set 1' },
  };
  const vbNext = {
    ...vbPrev,
    liveMatch: { ...vbPrev.liveMatch, scoreA: 11 },
  };
  assert.deepEqual(detectNewGoals([vbPrev], [vbNext], base.houses, 500), []);
});

test('applyTeamScoreDelta removes most recent goal for that team on -1 and combines 2nd Half with MM:SS clock', () => {
  const runningSecondHalf = {
    periodLabel: '2nd Half',
    matchPhase: '2nd Half',
    clockElapsedMs: 22 * 60_000,
    clockStartedAt: 100_000,
    clockRunning: true,
  };
  assert.equal(formatLiveMatchStatusDisplay(runningSecondHalf, 100_000 + 10_000), '2nd Half · 22:10');

  const pausedHalfTime = {
    periodLabel: 'Half Time',
    matchPhase: 'Half Time',
    clockElapsedMs: 22 * 60_000,
    clockStartedAt: null,
    clockRunning: false,
  };
  assert.equal(formatLiveMatchStatusDisplay(pausedHalfTime, 999_999), 'HALF TIME');

  const lm = {
    teamAHouse: 'red' as const,
    teamBHouse: 'blue' as const,
    scoreA: 2,
    scoreB: 1,
    timeline: [
      { id: 'gA1', side: 'A' as const, type: 'goal' as const, chestNo: '101', playerName: 'Aarav', minute: 5, createdAt: 100 },
      { id: 'yA1', side: 'A' as const, type: 'yellow' as const, chestNo: '102', playerName: 'Rohan', minute: 9, createdAt: 200 },
      { id: 'gB1', side: 'B' as const, type: 'goal' as const, chestNo: '201', playerName: 'Kabir', minute: 12, createdAt: 300 },
      { id: 'gA2', side: 'A' as const, type: 'goal' as const, chestNo: '', playerName: 'Goal', minute: 23, createdAt: 400 },
    ],
  };

  // -1 on Team A removes gA2 (the latest Team A goal), keeping yA1, gA1, and gB1 intact
  const res1 = applyTeamScoreDelta(lm, 'A', -1);
  assert.equal(res1.nextMatch.scoreA, 1);
  assert.equal(res1.nextMatch.scoreB, 1);
  assert.equal(res1.removedGoalId, 'gA2');
  assert.deepEqual(
    res1.nextMatch.timeline?.map((t) => t.id),
    ['gA1', 'yA1', 'gB1']
  );

  // -1 again on Team A removes gA1, score becomes 0
  const res2 = applyTeamScoreDelta(res1.nextMatch, 'A', -1);
  assert.equal(res2.nextMatch.scoreA, 0);
  assert.equal(res2.removedGoalId, 'gA1');
  assert.deepEqual(
    res2.nextMatch.timeline?.map((t) => t.id),
    ['yA1', 'gB1']
  );

  // -1 when score is already 0 does nothing and removes nothing
  const res3 = applyTeamScoreDelta(res2.nextMatch, 'A', -1);
  assert.equal(res3.nextMatch.scoreA, 0);
  assert.equal(res3.removedGoalId, null);
  assert.deepEqual(
    res3.nextMatch.timeline?.map((t) => t.id),
    ['yA1', 'gB1']
  );
});

test('Continuous running match clock, threshold alerts, referee phase controls, and added time badges', () => {
  assert.deepEqual([...MATCH_DURATION_PRESETS], [20, 30, 40, 60, 90]);
  assert.equal(getMatchDurationMins(undefined), 30);

  let match: any = {
    teamAHouse: 'red' as const,
    teamBHouse: 'blue' as const,
    scoreA: 0,
    scoreB: 0,
    periodLabel: 'Live Match',
    clockElapsedMs: 0,
    clockStartedAt: null,
    clockRunning: false,
  };

  // Start -> defaults phase to 1st Half and runs clock
  match = applyMatchClockCommand(match, 'start', 1_000_000);
  assert.equal(match.clockRunning, true);
  assert.equal(match.matchPhase, '1st Half');
  assert.equal(formatLiveMatchStatusDisplay(match, 1_000_000 + 5_000), '1st Half · 00:05');

  // Duration 30m -> half-time mark at 15:00 (900_000ms) fires 'half' alert without pausing clock!
  const at1459 = evaluateMatchThresholdAlert(match, 1_000_000 + 14 * 60_000 + 59_000);
  assert.equal(at1459.type, null);
  const at1500 = evaluateMatchThresholdAlert(match, 1_000_000 + 15 * 60_000);
  assert.equal(at1500.type, 'half');
  match = { ...match, halfTimeAlertPlayed: true };

  // Clock continues past 15:00 into 15:42 while referee sets +2' injury time
  match = applyAddedTimeChange(match, 2);
  assert.equal(formatLiveMatchStatusDisplay(match, 1_000_000 + 15 * 60_000 + 42_000), "1st Half · 15:42 (+2')");

  // Clear added time
  match = applyAddedTimeChange(match, 0);
  assert.equal(formatLiveMatchStatusDisplay(match, 1_000_000 + 15 * 60_000 + 42_000), '1st Half · 15:42');

  // Half Time -> pauses clock and displays HALF TIME
  match = applyMatchClockCommand(match, 'Half Time', 1_000_000 + 16 * 60_000);
  assert.equal(match.clockRunning, false);
  assert.equal(match.matchPhase, 'Half Time');
  assert.equal(formatLiveMatchStatusDisplay(match, 2_000_000), 'HALF TIME');

  // 2nd Half -> resumes clock from exact half-time mark (15:00 for 30m match) and displays 2nd Half · 15:00
  match = applyMatchClockCommand(match, '2nd Half', 2_500_000);
  assert.equal(match.clockRunning, true);
  assert.equal(match.matchPhase, '2nd Half');
  assert.equal(match.clockElapsedMs, 15 * 60_000);
  assert.equal(formatLiveMatchStatusDisplay(match, 2_500_000 + 18_000), '2nd Half · 15:18');

  // Full-time mark at 30:00 (15m into 2nd half) fires 'full' alert without stopping clock
  const at3000 = evaluateMatchThresholdAlert(match, 2_500_000 + 15 * 60_000);
  assert.equal(at3000.type, 'full');
  match = { ...match, fullTimeAlertPlayed: true };
  match = applyAddedTimeChange(match, 3);
  assert.equal(formatLiveMatchStatusDisplay(match, 2_500_000 + 15 * 60_000 + 25_000), "2nd Half · 30:25 (+3')");

  // Full Time -> stops clock and displays FULL TIME
  match = applyMatchClockCommand(match, 'Full Time', 2_500_000 + 16 * 60_000);
  assert.equal(match.clockRunning, false);
  assert.equal(match.matchPhase, 'Full Time');
  assert.equal(formatLiveMatchStatusDisplay(match, 9_999_999), 'FULL TIME');

  // Changing match duration to 20m recalculates thresholds cleanly
  match = applyMatchClockCommand(match, 'reset', 5_000_000);
  match = applyMatchDurationChange(match, 20, 5_000_000);
  assert.equal(getMatchDurationMins(match), 20);
  assert.equal(match.halfTimeAlertPlayed, false);
  assert.equal(match.fullTimeAlertPlayed, false);
  match = applyMatchClockCommand(match, 'start', 5_000_000);
  assert.equal(evaluateMatchThresholdAlert(match, 5_000_000 + 10 * 60_000).type, 'half');
});

