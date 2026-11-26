import type { Entry } from 'contentful-management';
import {
  describeError,
  linksChange,
  MembershipRecord,
  planUser,
  ROLLBACK_DATE,
  simulate,
  toMembershipRecord,
  toUserRecord,
  UserPlan,
  UserRecord,
  verify,
} from '../../scripts/migrate-user-labs';

const RUN_DATE = '2026-11-26';

const labCreatedAtById = new Map([
  ['lab-1', '2023-05-01T10:00:00.000Z'],
  ['lab-2', '2023-06-01T10:00:00.000Z'],
  ['lab-2026', '2026-03-15T10:00:00.000Z'],
]);

const membership = (
  overrides: Partial<MembershipRecord> & { id: string },
): MembershipRecord => ({
  createdAt: '2024-12-10T09:00:00.000Z',
  labId: 'lab-1',
  startDate: null,
  endDate: null,
  ...overrides,
});

const byId = (...memberships: MembershipRecord[]) =>
  new Map(memberships.map((item) => [item.id, item]));

const user = (labIds: string[], membershipIds: string[] = []): UserRecord => ({
  id: 'user-1',
  labIds,
  membershipIds,
});

const plan = (
  userRecord: UserRecord,
  membershipsById: Map<string, MembershipRecord> = new Map(),
) => planUser(userRecord, membershipsById, labCreatedAtById, RUN_DATE);

const emptyPlan: UserPlan = {
  updates: [],
  creates: [],
  unlink: [],
  anomalies: [],
};

describe('planUser', () => {
  test('creates an open membership starting on the rollback date for a lab created before it', () => {
    expect(plan(user(['lab-1']))).toEqual({
      ...emptyPlan,
      creates: [{ labId: 'lab-1', startDate: ROLLBACK_DATE }],
    });
  });

  test('creates an open membership starting on the lab creation date for a lab created after the rollback', () => {
    expect(plan(user(['lab-2026'])).creates).toEqual([
      { labId: 'lab-2026', startDate: '2026-03-15' },
    ]);
  });

  test('reuses a matching 2024 membership and starts it on its creation date', () => {
    const result = plan(
      user(['lab-1'], ['m1']),
      byId(membership({ id: 'm1' })),
    );

    expect(result).toEqual({
      ...emptyPlan,
      updates: [{ id: 'm1', fields: { startDate: '2024-12-10' } }],
    });
    expect(linksChange(result)).toBe(false);
  });

  test('ends a 2024 membership for a lab the user left on the rollback date', () => {
    expect(plan(user([], ['m1']), byId(membership({ id: 'm1' })))).toEqual({
      ...emptyPlan,
      updates: [
        {
          id: 'm1',
          fields: { startDate: '2024-12-10', endDate: ROLLBACK_DATE },
        },
      ],
    });
  });

  test('keeps the oldest open membership for a lab and unlinks the others', () => {
    const memberships = byId(
      membership({ id: 'newer', createdAt: '2025-01-20T09:00:00.000Z' }),
      membership({ id: 'oldest' }),
    );

    expect(plan(user(['lab-1'], ['newer', 'oldest']), memberships)).toEqual({
      ...emptyPlan,
      updates: [{ id: 'oldest', fields: { startDate: '2024-12-10' } }],
      unlink: ['newer'],
    });
  });

  test('does not treat the same membership linked twice as a duplicate', () => {
    const result = plan(
      user(['lab-1'], ['m1', 'm1']),
      byId(membership({ id: 'm1' })),
    );

    expect(result.unlink).toEqual([]);
  });

  test('changes nothing when the memberships already have their dates', () => {
    const memberships = byId(
      membership({ id: 'open', startDate: '2024-12-10' }),
      membership({
        id: 'closed',
        labId: 'lab-2',
        startDate: '2024-12-10',
        endDate: ROLLBACK_DATE,
      }),
    );

    expect(plan(user(['lab-1'], ['open', 'closed']), memberships)).toEqual(
      emptyPlan,
    );
  });

  test('ends a membership opened by a previous run on the run date when its lab left the Labs field', () => {
    const memberships = byId(
      membership({ id: 'm1', startDate: ROLLBACK_DATE }),
    );

    expect(plan(user([], ['m1']), memberships).updates).toEqual([
      { id: 'm1', fields: { endDate: RUN_DATE } },
    ]);
  });

  test('opens a new membership on the run date when the user rejoined a lab', () => {
    const memberships = byId(
      membership({ id: 'm1', startDate: ROLLBACK_DATE, endDate: '2026-11-20' }),
    );

    expect(plan(user(['lab-1'], ['m1']), memberships).creates).toEqual([
      { labId: 'lab-1', startDate: RUN_DATE },
    ]);
  });

  test('reports a 2024 membership created after the rollback date instead of ending it before it starts', () => {
    const memberships = byId(
      membership({ id: 'm1', createdAt: '2026-01-09T09:00:00.000Z' }),
    );
    const result = plan(user([], ['m1']), memberships);

    expect(result.updates).toEqual([]);
    expect(result.anomalies).toEqual([
      'membership m1 was created on 2026-01-09, after the 2025-02-06 end date',
    ]);
  });

  test('ends a 2024 membership created on the rollback date on that same day', () => {
    const memberships = byId(
      membership({ id: 'm1', createdAt: '2025-02-06T15:00:00.000Z' }),
    );

    expect(plan(user([], ['m1']), memberships)).toEqual({
      ...emptyPlan,
      updates: [
        {
          id: 'm1',
          fields: { startDate: ROLLBACK_DATE, endDate: ROLLBACK_DATE },
        },
      ],
    });
  });

  test('reports a lab from the Labs field that does not exist', () => {
    const result = plan(user(['deleted-lab']));

    expect(result.creates).toEqual([]);
    expect(result.anomalies).toEqual([
      'lab deleted-lab in the Labs field does not exist',
    ]);
  });

  test('reports a linked membership that does not exist', () => {
    expect(plan(user(['lab-1'], ['missing'])).anomalies).toEqual([
      'membership missing is missing or has no lab',
    ]);
  });
});

describe('verify', () => {
  test('lists the labs missing from or extra to the open memberships', () => {
    const memberships = byId(membership({ id: 'm1', labId: 'lab-2' }));

    expect(verify([user(['lab-1'], ['m1'])], memberships)).toEqual([
      { userId: 'user-1', missing: ['lab-1'], extra: ['lab-2'] },
    ]);
  });

  test('ignores closed memberships', () => {
    const memberships = byId(
      membership({ id: 'm1', startDate: '2024-12-10', endDate: ROLLBACK_DATE }),
    );

    expect(verify([user([], ['m1'])], memberships)).toEqual([]);
  });
});

describe('simulate', () => {
  test('leaves no differences once every plan is applied', () => {
    const userRecord = user(['lab-1', 'lab-2026'], ['m1', 'm2', 'm3']);
    const memberships = byId(
      membership({ id: 'm1' }),
      membership({ id: 'm2', createdAt: '2025-01-20T09:00:00.000Z' }),
      membership({ id: 'm3', labId: 'lab-2' }),
    );
    const userPlan = plan(userRecord, memberships);

    const result = simulate(
      [userRecord],
      memberships,
      new Map([[userRecord.id, userPlan]]),
    );

    expect(verify([userRecord], memberships)).not.toEqual([]);
    expect(verify(result.users, result.membershipsById)).toEqual([]);
    expect(result.users[0]?.membershipIds).toEqual([
      'm1',
      'm3',
      'new-user-1-lab-2026',
    ]);
  });
});

describe('records', () => {
  test('reads an entry that a select returned with no fields object', () => {
    const entry = {
      sys: { id: 'empty', createdAt: '2026-01-09T09:00:00.000Z' },
    } as unknown as Entry;

    expect(toUserRecord(entry)).toEqual({
      id: 'empty',
      labIds: [],
      membershipIds: [],
    });
    expect(toMembershipRecord(entry)).toEqual({
      id: 'empty',
      createdAt: '2026-01-09T09:00:00.000Z',
      labId: null,
      startDate: null,
      endDate: null,
    });
  });
});

describe('describeError', () => {
  test('keeps the error name, status, request id and field paths but not the request body or field values', () => {
    const error = new Error(
      JSON.stringify({
        status: 422,
        statusText: 'Unprocessable Entity',
        message: 'Validation error',
        details: {
          errors: [
            {
              name: 'unique',
              path: ['fields', 'email', 'en-US'],
              value: 'jane@example.org',
            },
          ],
        },
        request: {
          method: 'put',
          payloadData: JSON.stringify({
            fields: { firstName: { 'en-US': 'Jane' } },
          }),
        },
        requestId: 'req-1',
      }),
    );
    error.name = 'ValidationFailed';

    expect(describeError(error)).toBe(
      'ValidationFailed, 422, req-1, unique at ["fields","email","en-US"]',
    );
  });

  test('keeps the message of an error that is not a Contentful response', () => {
    expect(describeError(new TypeError('socket hang up'))).toBe(
      'TypeError: socket hang up',
    );
  });
});
