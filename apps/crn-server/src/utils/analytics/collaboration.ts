import {
  FetchTeamCollaborationQuery,
  FetchUserResearchOutputsQuery,
  FetchUserTotalResearchOutputsQuery,
} from '@asap-hub/contentful';
import {
  DocumentCategoryOption,
  OutputTypeOption,
  TeamCollaborationAcrossOutputData,
  TeamCollaborationDataObject,
  TeamCollaborationWithinOutputData,
  TeamOutputDocumentType,
  TeamRole,
  TimeRangeOption,
  UserCollaborationDataObject,
  UserCollaborationTeam,
} from '@asap-hub/model';
import { cleanArray, parseUserDisplayName } from '@asap-hub/server-common';
import {
  getFilterOutputByDocumentCategory,
  getFilterOutputByRange,
  getFilterOutputBySharingStatus,
  isAsapFundedResearchOutput,
  isTeamOutputDocumentType,
} from './common';

export const hasDifferentTeams = (
  userTeamIds: Set<string>,
  coAuthorTeamIds: string[],
): boolean => coAuthorTeamIds.every((id) => !userTeamIds.has(id));

export const hasSameTeamAndDifferentLab = (
  userTeamId: string,
  userLabIds: Set<string>,
  coAuthorTeamIds: string[],
  coAuthorLabIds: string[],
): boolean => {
  const sameTeam = coAuthorTeamIds.some(
    (coAuthorTeamId) => coAuthorTeamId === userTeamId,
  );
  const differentLabs = coAuthorLabIds.every(
    (coAuthorLabId) => !userLabIds.has(coAuthorLabId),
  );
  return sameTeam && differentLabs;
};

export type UserData = {
  name: string;
  alumniSince?: string;
  teams: Omit<
    UserCollaborationTeam,
    'outputsCoAuthoredWithinTeam' | 'outputsCoAuthoredAcrossTeams'
  >[];
  labIds: string[];
  teamIds: string[];
  researchOutputs: number;
};

export const getUserDataById = (
  userItems: NonNullable<
    FetchUserTotalResearchOutputsQuery['usersCollection']
  >['items'],
): { [userId: string]: UserData } =>
  userItems.reduce((dataByUserId: { [userId: string]: UserData }, item) => {
    if (!item) return dataByUserId;

    const userId = item.sys.id;
    return {
      ...dataByUserId,
      [userId]: {
        name: parseUserDisplayName(
          item.firstName ?? '',
          item.lastName ?? '',
          undefined,
          item.nickname ?? '',
        ),
        alumniSince: item.alumniSinceDate ?? undefined,
        teams:
          item.teamsCollection?.items.map((teamItem) => ({
            id: teamItem?.team ? teamItem.team.sys.id : '',
            team: teamItem?.team?.displayName ?? '',
            role: (teamItem?.role as TeamRole) ?? undefined,
            teamInactiveSince: teamItem?.team?.inactiveSince ?? undefined,
            teamMembershipInactiveSince:
              teamItem?.inactiveSinceDate ?? undefined,
          })) || [],
        labIds:
          item?.labsCollection?.items.map((labItem) => labItem?.sys.id || '') ||
          [],
        teamIds:
          item?.teamsCollection?.items.map(
            (teamItem) => teamItem?.team?.sys.id || '',
          ) || [],
        researchOutputs:
          item?.linkedFrom?.researchOutputsCollection?.total || 0,
      },
    };
  }, {});

export const getUserCollaborationItems = (
  collection: FetchUserResearchOutputsQuery['usersCollection'],
  userDataById: { [userId: string]: UserData },
  rangeKey?: TimeRangeOption,
  documentCategory?: DocumentCategoryOption,
): UserCollaborationDataObject[] => {
  const collaboration: UserCollaborationDataObject[] = [];

  cleanArray(collection?.items).forEach((item) => {
    const userId = item.sys.id;

    const userData = userDataById[userId];
    if (userData) {
      const userTeamIds = new Set(userData?.teamIds);
      const userLabIds = new Set(userData?.labIds);
      const totalUserOutputsCoAuthoredAcrossTeamsSet = new Set();
      const totalUserOutputsCoAuthoredWithinTeamSet = new Set();

      const teams = userData?.teamIds.map((userTeamId) => {
        const outputsCoAuthoredAcrossTeamsSet = new Set();
        const outputsCoAuthoredWithinTeamSet = new Set();

        item.linkedFrom?.researchOutputsCollection?.items
          .filter(isAsapFundedResearchOutput)
          .filter(getFilterOutputByRange(rangeKey))
          .filter(getFilterOutputByDocumentCategory(documentCategory))
          .forEach((output) => {
            const authorIds = cleanArray(
              output?.authorsCollection?.items,
            ).reduce((ids: string[], author) => {
              if (author.__typename === 'Users') {
                ids.push(author.sys.id);
              }
              return ids;
            }, []);

            authorIds.forEach((authorId) => {
              if (authorId !== userId) {
                const coAuthor = userDataById[authorId];

                if (
                  hasSameTeamAndDifferentLab(
                    userTeamId,
                    userLabIds,
                    coAuthor?.teamIds || [],
                    coAuthor?.labIds || [],
                  )
                ) {
                  outputsCoAuthoredWithinTeamSet.add(output?.sys.id);
                  totalUserOutputsCoAuthoredWithinTeamSet.add(output?.sys.id);
                }

                if (hasDifferentTeams(userTeamIds, coAuthor?.teamIds || [])) {
                  outputsCoAuthoredAcrossTeamsSet.add(output?.sys.id);
                  totalUserOutputsCoAuthoredAcrossTeamsSet.add(output?.sys.id);
                }
              }
            });
          });

        return {
          ...(userData.teams.find(
            (teamItem) => teamItem.id === userTeamId,
          ) as UserCollaborationDataObject['teams'][number]),
          outputsCoAuthoredAcrossTeams: outputsCoAuthoredAcrossTeamsSet.size,
          outputsCoAuthoredWithinTeam: outputsCoAuthoredWithinTeamSet.size,
        };
      });

      collaboration.push({
        id: userId,
        name: userData.name,
        alumniSince: userData.alumniSince,
        teams,
        totalUniqueOutputsCoAuthoredAcrossTeams:
          totalUserOutputsCoAuthoredAcrossTeamsSet.size,
        totalUniqueOutputsCoAuthoredWithinTeam:
          totalUserOutputsCoAuthoredWithinTeamSet.size,
      });
    }
  });

  return collaboration;
};

const getTeamCollaborationAcrossData = (
  outputs: {
    hasMultipleTeams: boolean;
    documentType: TeamOutputDocumentType;
    teams: Team[];
  }[],
): TeamCollaborationAcrossOutputData => {
  const seenCollaborationTeams: string[] = [];
  return outputs.reduce(
    (acc, outputData) => {
      cleanArray(outputData.teams).forEach((team) => {
        const teamId = team?.sys.id;
        if (seenCollaborationTeams.includes(teamId)) {
          const teamData = acc.byTeam.find(
            (outputTeam) => outputTeam.id === teamId,
          ) as TeamCollaborationAcrossOutputData['byTeam'][number];
          teamData[outputData.documentType] += 1;
        } else {
          acc.byTeam.push({
            id: teamId,
            name: team.displayName ?? '',
            isInactive: !!team.inactiveSince,
            Article: 0,
            Bioinformatics: 0,
            Dataset: 0,
            'Lab Material': 0,
            Protocol: 0,
            [outputData.documentType]: 1,
          });
          seenCollaborationTeams.push(teamId);
        }
      });
      return {
        ...acc,
        byDocumentType: {
          ...acc.byDocumentType,
          [outputData.documentType]:
            acc.byDocumentType[outputData.documentType] + 1,
        },
      };
    },
    {
      byDocumentType: {
        Article: 0,
        Bioinformatics: 0,
        Dataset: 0,
        'Lab Material': 0,
        Protocol: 0,
      },
      byTeam: [] as TeamCollaborationAcrossOutputData['byTeam'],
    },
  );
};

const countOutputsByDocumentType = (
  outputs: {
    documentType: TeamOutputDocumentType;
  }[],
): TeamCollaborationWithinOutputData =>
  outputs.reduce(
    (acc, outputData) => ({
      ...acc,
      [outputData.documentType]: acc[outputData.documentType] + 1,
    }),
    {
      Article: 0,
      Bioinformatics: 0,
      Dataset: 0,
      'Lab Material': 0,
      Protocol: 0,
    },
  );

export const getTeamCollaborationItems = (
  teamCollection: FetchTeamCollaborationQuery['teamsCollection'],
  rangeKey?: TimeRangeOption,
  outputType?: OutputTypeOption,
): TeamCollaborationDataObject[] =>
  cleanArray(teamCollection?.items).map((team) => {
    const outputsData = team.linkedFrom?.researchOutputsCollection?.items
      .filter(isAsapFundedResearchOutput)
      .filter(getFilterOutputByRange(rangeKey))
      .filter(getFilterOutputBySharingStatus(outputType))
      .filter(
        (output) =>
          output?.documentType && isTeamOutputDocumentType(output.documentType),
      )
      .map((output) => {
        const data = {
          hasMultipleTeams: false,
          hasMultipleLabs: false,
          documentType: output?.documentType as TeamOutputDocumentType,
          teams: [] as Team[],
        };
        const contributingTeams = cleanArray(output?.teamsCollection?.items);
        if (contributingTeams.length > 1) {
          data.hasMultipleTeams = true;
          data.teams = contributingTeams.filter(
            (currentTeam) => currentTeam.sys.id !== team.sys.id,
          );
        }
        if ((output?.labsCollection?.total || 0) > 1) {
          data.hasMultipleLabs = true;
        }
        return data;
      });

    const outputsCoProducedAcross = getTeamCollaborationAcrossData(
      cleanArray(outputsData?.filter((output) => output.hasMultipleTeams)),
    );
    outputsCoProducedAcross.byTeam.sort((a, b) => a.name.localeCompare(b.name));
    const outputsCoProducedWithin = countOutputsByDocumentType(
      cleanArray(outputsData?.filter((output) => output.hasMultipleLabs)),
    );
    // Counted from the same filtered set as the co-produced numbers above, so a
    // consumer can take a ratio from one document instead of joining indices.
    const totalOutputs = countOutputsByDocumentType(cleanArray(outputsData));

    return {
      id: team.sys.id,
      name: team.displayName ?? '',
      inactiveSince: team.inactiveSince ?? undefined,
      outputsCoProducedAcross,
      outputsCoProducedWithin,
      totalOutputs,
    };
  });

type Team = NonNullable<
  NonNullable<
    NonNullable<
      NonNullable<
        NonNullable<
          NonNullable<
            FetchTeamCollaborationQuery['teamsCollection']
          >['items'][number]
        >['linkedFrom']
      >['researchOutputsCollection']
    >['items'][number]
  >['teamsCollection']
>['items'][number];
