import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeHouseStandings,
  computeTopAthletes,
  DEFAULT_POINT_RULES,
  formatStopwatch,
  inferDivision,
  parseStudentCsv,
  validatePinRole,
  type SportsDayState,
} from './sportsEngine';

function createBaseState(): SportsDayState {
  return {
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

test('PIN role validation enforces 1111 for official and 7860 for admin', () => {
  assert.equal(validatePinRole('1111'), 'official');
  assert.equal(validatePinRole('7860'), 'admin');
  assert.equal(validatePinRole('0000'), null);
  assert.equal(validatePinRole(''), null);
});

test('CSV parser parses student rows, skips header, and deduplicates chest numbers', () => {
  const csv = `
ChestNo, Name, House, Category
101, Aarav Sharma, Red, Junior Boys
102, Priya Nair, Blue, Senior Girls
101, Duplicate Student, Green, Junior Boys
103, Invalid House, Purple, Open
`;
  const parsed = parseStudentCsv(csv);
  assert.equal(parsed.length, 2);
  assert.deepEqual(parsed[0], {
    chestNo: '101',
    name: 'Aarav Sharma',
    house: 'red',
    category: 'Junior Boys',
  });
  assert.deepEqual(parsed[1], {
    chestNo: '102',
    name: 'Priya Nair',
    house: 'blue',
    category: 'Senior Girls',
  });
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
    {
      id: 'ev3',
      name: '200m Heat',
      category: 'Junior Girls',
      type: 'individual',
      venue: 'Track',
      status: 'UPCOMING',
      updatedAt: 300,
      winners: [],
    },
  ];

  const standings = computeHouseStandings(state);
  // Blue: 3 (silver indiv) + 10 (gold team) = 13
  // Red: 5 (gold indiv) + 6 (silver team) = 11
  // Green: 1 (bronze indiv) = 1
  // Yellow: 0
  assert.equal(standings[0].id, 'blue');
  assert.equal(standings[0].points, 13);
  assert.equal(standings[0].gold, 1);
  assert.equal(standings[0].silver, 1);
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
