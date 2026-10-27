import { NotFoundError } from '@asap-hub/errors';
import WorkingGroups, {
  toWorkingGroupResponse,
} from '../../src/controllers/working-group.controller';
import {
  getWorkingGroupDataObject,
  getWorkingGroupResponse,
} from '../fixtures/working-groups.fixtures';
import { getDataProviderMock } from '../mocks/data-provider.mock';
import {
  createWorkingGroupLeaders,
  createWorkingGroupMembers,
} from '@asap-hub/fixtures';

describe('Working Group controller', () => {
  const workingGroupDataProviderMock = getDataProviderMock();
  const workingGroupController = new WorkingGroups(
    workingGroupDataProviderMock,
  );

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Fetch', () => {
    test('Should return the working groups', async () => {
      workingGroupDataProviderMock.fetch.mockResolvedValueOnce({
        total: 1,
        items: [getWorkingGroupDataObject()],
      });

      const result = await workingGroupController.fetch({});

      expect(result).toEqual({
        items: [getWorkingGroupDataObject()],
        total: 1,
      });
    });

    test('Should return an empty list when there are no working groups', async () => {
      workingGroupDataProviderMock.fetch.mockResolvedValueOnce({
        total: 0,
        items: [],
      });
      const result = await workingGroupController.fetch({});

      expect(result).toEqual({ items: [], total: 0 });
    });

    test.each`
      filter                    | filterValue
      ${['Active']}             | ${{ filter: { complete: false } }}
      ${['Complete']}           | ${{ filter: { complete: true } }}
      ${[]}                     | ${{}}
      ${['Active', 'Complete']} | ${{}}
    `(
      `Should call data provider with correct filter when filter is $filter`,
      async ({ filter, filterValue }) => {
        workingGroupDataProviderMock.fetch.mockResolvedValueOnce({
          total: 1,
          items: [getWorkingGroupDataObject()],
        });

        await workingGroupController.fetch({ filter });

        expect(workingGroupDataProviderMock.fetch).toBeCalledWith(filterValue);
      },
    );
  });

  describe('Fetch-by-ID method', () => {
    test('Should throw when working-group is not found', async () => {
      workingGroupDataProviderMock.fetchById.mockResolvedValueOnce(null);

      await expect(
        workingGroupController.fetchById('not-found'),
      ).rejects.toThrow(NotFoundError);
    });

    test('Should return the working-group when it finds it', async () => {
      workingGroupDataProviderMock.fetchById.mockResolvedValueOnce(
        getWorkingGroupDataObject(),
      );
      const result = await workingGroupController.fetchById('group-id');

      expect(result).toEqual(getWorkingGroupResponse());
    });
  });
});

describe('toWorkingGroupResponse', () => {
  test('should set `isActive` to true for leaders & members if they are not alumni, inactiveSinceDate not set and working group is in progress', () => {
    const leaders = createWorkingGroupLeaders(1).map(
      ({ isActive, ...leader }) => ({
        ...leader,
      }),
    );
    const members = createWorkingGroupMembers(1).map(
      ({ isActive, ...member }) => ({
        ...member,
      }),
    );
    const workingGroup = {
      ...getWorkingGroupDataObject(),
      leaders,
      members,
      complete: false,
    };

    expect(toWorkingGroupResponse(workingGroup)).toEqual({
      id: '123',
      tags: [],
      title: 'Working Group Title',
      description: '<p>Working Group Description</p>',
      shortText: 'Working Group Short Text',
      deliverables: [],
      researchOutputsIds: [],
      leaders: [{ ...leaders[0], isActive: true }],
      members: [{ ...members[0], isActive: true }],
      complete: false,
      lastModifiedDate: '2021-01-01T00:00:00.000Z',
      externalLink: 'https://example.com',
      calendars: [
        {
          id: 'hub@asap.science',
          color: '#B1365F',
          name: 'ASAP Hub',
          interestGroups: [],
          workingGroups: [],
          crnCalendar: false,
          seminarSeries: false,
        },
      ],
    });
  });

  test('should set `isActive` to false for leaders & members if working group is complete', () => {
    const leaders = createWorkingGroupLeaders(1).map(
      ({ isActive, ...leader }) => ({ ...leader }),
    );
    const members = createWorkingGroupMembers(1).map(
      ({ isActive, ...member }) => ({ ...member }),
    );
    const workingGroup = {
      ...getWorkingGroupDataObject(),
      leaders,
      members,
      complete: true,
    };

    expect(toWorkingGroupResponse(workingGroup)).toEqual({
      id: '123',
      tags: [],
      title: 'Working Group Title',
      description: '<p>Working Group Description</p>',
      shortText: 'Working Group Short Text',
      deliverables: [],
      researchOutputsIds: [],
      leaders: [{ ...leaders[0], isActive: false }],
      members: [{ ...members[0], isActive: false }],
      complete: true,
      lastModifiedDate: '2021-01-01T00:00:00.000Z',
      externalLink: 'https://example.com',
      calendars: [
        {
          id: 'hub@asap.science',
          color: '#B1365F',
          name: 'ASAP Hub',
          interestGroups: [],
          workingGroups: [],
          crnCalendar: false,
          seminarSeries: false,
        },
      ],
    });
  });

  test('should set `isActive` to false for leaders & members if they are alumni', () => {
    const leaders = createWorkingGroupLeaders(1).map(
      ({ isActive, ...leader }) => ({
        ...leader,
        user: { ...leader.user, alumniSinceDate: new Date().toISOString() },
      }),
    );
    const members = createWorkingGroupMembers(1).map(
      ({ isActive, ...member }) => ({
        ...member,
        user: { ...member.user, alumniSinceDate: new Date().toISOString() },
      }),
    );
    const workingGroup = {
      ...getWorkingGroupDataObject(),
      leaders,
      members,
      complete: false,
    };

    expect(toWorkingGroupResponse(workingGroup)).toEqual({
      id: '123',
      tags: [],
      title: 'Working Group Title',
      description: '<p>Working Group Description</p>',
      shortText: 'Working Group Short Text',
      deliverables: [],
      researchOutputsIds: [],
      leaders: [{ ...leaders[0], isActive: false }],
      members: [{ ...members[0], isActive: false }],
      complete: false,
      lastModifiedDate: '2021-01-01T00:00:00.000Z',
      externalLink: 'https://example.com',
      calendars: [
        {
          id: 'hub@asap.science',
          color: '#B1365F',
          name: 'ASAP Hub',
          interestGroups: [],
          workingGroups: [],
          crnCalendar: false,
          seminarSeries: false,
        },
      ],
    });
  });

  test('should set `isActive` to false for leaders & members if they are set to inactive', () => {
    const leaders = createWorkingGroupLeaders(1).map(
      ({ isActive, ...leader }) => ({
        ...leader,
        inactiveSinceDate: new Date().toISOString(),
      }),
    );
    const members = createWorkingGroupMembers(1).map(
      ({ isActive, ...member }) => ({
        ...member,
        inactiveSinceDate: new Date().toISOString(),
      }),
    );
    const workingGroup = {
      ...getWorkingGroupDataObject(),
      leaders,
      members,
      complete: false,
    };

    expect(toWorkingGroupResponse(workingGroup)).toEqual({
      id: '123',
      tags: [],
      title: 'Working Group Title',
      description: '<p>Working Group Description</p>',
      shortText: 'Working Group Short Text',
      deliverables: [],
      researchOutputsIds: [],
      leaders: [{ ...leaders[0], isActive: false }],
      members: [{ ...members[0], isActive: false }],
      complete: false,
      lastModifiedDate: '2021-01-01T00:00:00.000Z',
      externalLink: 'https://example.com',
      calendars: [
        {
          id: 'hub@asap.science',
          color: '#B1365F',
          name: 'ASAP Hub',
          interestGroups: [],
          workingGroups: [],
          crnCalendar: false,
          seminarSeries: false,
        },
      ],
    });
  });
});
