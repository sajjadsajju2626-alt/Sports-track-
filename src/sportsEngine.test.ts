import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInviteMessage,
  computeHouseStandings,
  computeTopAthletes,
  DEFAULT_POINT_RULES,
  formatStopwatch,
  generateCsvTemplate,
  inferDivision,
  isStudentRegisteredForEvent,
  normalizeSchoolCode,
  parseStudentCsv,
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
