import { getAttendanceToSync } from '../../src/utils/event-attendance';

describe('getAttendanceToSync', () => {
  test('adds missing teams with attended set to false', () => {
    expect(
      getAttendanceToSync(
        [{ id: 'attendance-1', teamId: 'team-1', attended: false }],
        ['team-1', 'team-2'],
      ),
    ).toEqual([
      { id: 'attendance-1', teamId: 'team-1', attended: false },
      { teamId: 'team-2', attended: false },
    ]);
  });

  test('removes teams that are not in the list', () => {
    expect(
      getAttendanceToSync(
        [
          { id: 'attendance-1', teamId: 'team-1', attended: false },
          { id: 'attendance-2', teamId: 'team-2', attended: false },
        ],
        ['team-1'],
      ),
    ).toEqual([{ id: 'attendance-1', teamId: 'team-1', attended: false }]);
  });

  test('adds and removes teams at the same time', () => {
    expect(
      getAttendanceToSync(
        [{ id: 'attendance-1', teamId: 'team-1', attended: false }],
        ['team-2'],
      ),
    ).toEqual([{ teamId: 'team-2', attended: false }]);
  });

  test('keeps the attended value of existing entries', () => {
    expect(
      getAttendanceToSync(
        [{ id: 'attendance-1', teamId: 'team-1', attended: true }],
        ['team-1', 'team-2'],
      ),
    ).toEqual([
      { id: 'attendance-1', teamId: 'team-1', attended: true },
      { teamId: 'team-2', attended: false },
    ]);
  });

  test('removes all attendance when there are no teams', () => {
    expect(
      getAttendanceToSync(
        [{ id: 'attendance-1', teamId: 'team-1', attended: false }],
        [],
      ),
    ).toEqual([]);
  });

  test('returns null when the attendance already matches the teams', () => {
    expect(
      getAttendanceToSync(
        [{ id: 'attendance-1', teamId: 'team-1', attended: false }],
        ['team-1'],
      ),
    ).toBeNull();
  });

  test('returns null when there is no attendance and no teams', () => {
    expect(getAttendanceToSync([], [])).toBeNull();
  });
});
