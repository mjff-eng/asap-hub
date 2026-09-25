import { InterestGroupMembership } from '@asap-hub/model';
import { isEventProjectManager } from '../../permissions/event';

const event = { interestGroup: { id: 'group-1' } };

const membership = (
  overrides: Partial<InterestGroupMembership> = {},
): InterestGroupMembership => ({
  id: 'group-1',
  name: 'Group 1',
  active: true,
  role: 'Project Manager',
  ...overrides,
});

describe('isEventProjectManager', () => {
  test('Should return true for an active project manager of the hosting group', () => {
    expect(
      isEventProjectManager({ interestGroups: [membership()] }, event),
    ).toBe(true);
  });

  test.each`
    description                               | overrides
    ${'project manager of another group'}     | ${{ id: 'group-other' }}
    ${'chair of the hosting group'}           | ${{ role: 'Chair' }}
    ${'lapsed leadership carrying no role'}   | ${{ role: undefined }}
    ${'project manager of an inactive group'} | ${{ active: false }}
  `('Should return false for a $description', ({ overrides }) => {
    expect(
      isEventProjectManager({ interestGroups: [membership(overrides)] }, event),
    ).toBe(false);
  });

  test.each([null, undefined])(
    'Should return false when the user is %s',
    (user) => {
      expect(isEventProjectManager(user, event)).toBe(false);
    },
  );

  test('Should return false when the event has no interest group', () => {
    expect(
      isEventProjectManager(
        { interestGroups: [membership()] },
        {
          interestGroup: undefined,
        },
      ),
    ).toBe(false);
  });
});
