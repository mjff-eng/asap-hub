import {
  getLatestUserAward,
  getUserAwards,
  isUserDegree,
  isUserRole,
  userDegree,
  userRole,
  toUserListItem,
} from '../src';

describe('User', () => {
  describe('Role', () => {
    it.each(userRole)('should recognise correct role - %s', (role) => {
      expect(isUserRole(role)).toEqual(true);
    });

    it('should not recognise incorrect role', () => {
      expect(isUserRole('not-a-role')).toEqual(false);
    });
  });

  describe('User degree', () => {
    it.each(userDegree)('should recognise correct degree - %s', (degree) => {
      expect(isUserDegree(degree)).toEqual(true);
    });

    it('should not recognise incorrect degree', () => {
      expect(isUserDegree('not-a-degree')).toEqual(false);
    });
  });

  describe('toUserListItem', () => {
    it('should convert user response to algolia user item response', () => {
      expect(
        toUserListItem({
          id: 'user-1',
          createdDate: '2020-09-07T17:36:54Z',
          lastModifiedDate: '2020-09-07T17:36:54Z',
          onboarded: true,
          displayName: 'Jane Doe',
          fullDisplayName: 'Jane Doe',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane.doe@asap.com',
          jobTitle: 'Assistant Professor',
          institution: 'University of Toronto',
          country: 'Canada',
          city: 'Toronto',
          orcid: '0000-0001-8203-6901',
          orcidWorks: [],
          tags: [
            { id: '1', name: 'Blood' },
            { id: '2', name: 'Parkinson' },
          ],
          questions: [],
          role: 'Grantee',
          social: {
            github: '',
            googleScholar: '',
            linkedIn: '',
            orcid: '',
            researchGate: '',
            researcherId: '',
            twitter: '',
          },
          workingGroups: [],
          interestGroups: [],
          labs: [{ id: 'cd7be4902', name: 'Brighton' }],
          teams: [
            {
              displayName: 'Alessi',
              id: 'team-alessi',
              role: 'Lead PI (Core Leadership)',
              inactiveSinceDate: '',
            },
            {
              displayName: 'De Camilli',
              id: 'team-de-camilli',
              role: 'Project Manager',
              inactiveSinceDate: '',
            },
          ],
        }),
      ).toEqual({
        _tags: ['Blood', 'Parkinson'],
        tags: [
          { id: '1', name: 'Blood' },
          { id: '2', name: 'Parkinson' },
        ],
        alumniSinceDate: undefined,
        avatarUrl: undefined,
        biography: undefined,
        city: 'Toronto',
        contactEmail: undefined,
        country: 'Canada',
        createdDate: '2020-09-07T17:36:54Z',
        degree: undefined,
        dismissedGettingStarted: undefined,
        displayName: 'Jane Doe',
        email: 'jane.doe@asap.com',
        firstName: 'Jane',
        id: 'user-1',
        institution: 'University of Toronto',
        jobTitle: 'Assistant Professor',
        labs: [{ id: 'cd7be4902', name: 'Brighton' }],
        lastName: 'Doe',
        fullDisplayName: 'Jane Doe',
        membershipStatus: undefined,
        middleName: undefined,
        nickname: undefined,
        onboarded: true,
        openScienceTeamMember: undefined,
        techSupport: undefined,
        orcid: '0000-0001-8203-6901',
        role: 'Grantee',
        social: {
          github: '',
          googleScholar: '',
          linkedIn: '',
          orcid: '',
          researchGate: '',
          researcherId: '',
          twitter: '',
        },
        stateOrProvince: undefined,
        teams: [
          {
            displayName: 'Alessi',
            id: 'team-alessi',
            role: 'Lead PI (Core Leadership)',
          },
          {
            displayName: 'De Camilli',
            id: 'team-de-camilli',
            role: 'Project Manager',
          },
        ],
      });
    });

    it('carries team awards through to the algolia list item', () => {
      const awards = [
        { name: 'Open Science Champion', date: '2024-01-01', iconUrl: 'icon' },
      ];
      const listItem = toUserListItem({
        id: 'user-2',
        createdDate: '2020-09-07T17:36:54Z',
        lastModifiedDate: '2020-09-07T17:36:54Z',
        onboarded: true,
        displayName: 'Awarded User',
        fullDisplayName: 'Awarded User',
        firstName: 'Awarded',
        lastName: 'User',
        email: 'awarded.user@asap.com',
        orcidWorks: [],
        tags: [],
        questions: [],
        role: 'Grantee',
        social: {},
        workingGroups: [],
        interestGroups: [],
        labs: [],
        teams: [
          {
            displayName: 'Alessi',
            id: 'team-alessi',
            role: 'Project Manager',
            awards,
          },
          {
            displayName: 'De Camilli',
            id: 'team-de-camilli',
            role: 'Project Manager',
          },
        ],
      });

      expect(listItem.teams).toEqual([
        {
          displayName: 'Alessi',
          id: 'team-alessi',
          role: 'Project Manager',
          awards,
        },
        {
          displayName: 'De Camilli',
          id: 'team-de-camilli',
          role: 'Project Manager',
        },
      ]);
    });
  });

  describe('awards selectors', () => {
    const teams = [
      {
        displayName: 'Team A',
        awards: [
          { name: 'Open Science Champion', date: '2023-01-01', iconUrl: 'a' },
        ],
      },
      {
        displayName: 'Team B',
        awards: [
          { name: 'Open Science Champion', date: '2024-06-01', iconUrl: 'b' },
        ],
      },
      { displayName: 'Team C' },
    ];

    describe('getUserAwards', () => {
      it('flattens awards across teams, newest first, with the awarding team name', () => {
        expect(getUserAwards(teams)).toEqual([
          {
            name: 'Open Science Champion',
            date: '2024-06-01',
            iconUrl: 'b',
            teamName: 'Team B',
          },
          {
            name: 'Open Science Champion',
            date: '2023-01-01',
            iconUrl: 'a',
            teamName: 'Team A',
          },
        ]);
      });

      it('returns an empty array when teams are undefined', () => {
        expect(getUserAwards()).toEqual([]);
      });
    });

    describe('getLatestUserAward', () => {
      it('returns the most recent award by date', () => {
        expect(getLatestUserAward(teams)?.date).toEqual('2024-06-01');
        expect(getLatestUserAward(teams)?.teamName).toEqual('Team B');
      });

      it('returns undefined when there are no awards', () => {
        expect(getLatestUserAward([{ displayName: 'Team C' }])).toBeUndefined();
      });

      it('returns undefined when teams are undefined', () => {
        expect(getLatestUserAward()).toBeUndefined();
      });

      it('keeps the first award on equal dates', () => {
        expect(
          getLatestUserAward([
            {
              displayName: 'Team A',
              awards: [{ name: 'Open Science Champion', date: '2024-01-01' }],
            },
            {
              displayName: 'Team B',
              awards: [{ name: 'Open Science Champion', date: '2024-01-01' }],
            },
          ])?.teamName,
        ).toEqual('Team A');
      });
    });
  });
});
