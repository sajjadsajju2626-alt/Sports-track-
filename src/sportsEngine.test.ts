import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInviteMessage,
  buildPublicShareUrl,
  computeHousePointBreakdown,
  computeHouseStandings,
  computeTopAthletes,
  createRevertedUpcomingEvent,
  DEFAULT_POINT_RULES,
  formatCricketScore,
  formatStopwatch,
  generateCsvTemplate,
  getEditablePeriodValue,
  getEventPointRules,
  getEventTypeLabel,
  incrementCricketOvers,
  inferDivision,
  isCricketEvent,
  isHouseGroupPodiumEvent,
  isRelayEvent,
  isStudentRegisteredForEvent,
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
