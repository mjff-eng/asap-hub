import { EntityResponses } from '@asap-hub/algolia';
import {
  SpeakerSearchOption,
  SpeakerTeamOption,
} from '@asap-hub/react-components';

type UserHit = EntityResponses['crn']['user'];
type ExternalAuthorHit = EntityResponses['crn']['external-author'];

const isUserHit = (hit: UserHit | ExternalAuthorHit): hit is UserHit =>
  // eslint-disable-next-line no-underscore-dangle
  hit.__meta.type === 'user';

const toUserAffiliationOptions = ({
  teams,
  individualProjects,
}: UserHit): SpeakerTeamOption[] => [
  ...teams.map(
    (team): SpeakerTeamOption => ({
      variant: 'team',
      id: team.id,
      name: team.displayName ?? '',
      teamType: team.teamType,
      isTeamInactive: !!team.teamInactiveSince,
      role: team.role,
    }),
  ),
  // Missing from user records indexed before the field existed.
  ...(individualProjects ?? []).map(
    (project): SpeakerTeamOption => ({
      variant: 'project',
      id: project.id,
      name: project.title,
      projectType: project.projectType,
      role: project.role,
    }),
  ),
];

export const toSpeakerSearchOptions = (
  hits: ReadonlyArray<UserHit | ExternalAuthorHit>,
): SpeakerSearchOption[] => [
  ...hits.filter(isUserHit).map(
    (user): SpeakerSearchOption => ({
      value: user.id,
      label: user.displayName,
      user: {
        userId: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        isAlumni: !!user.alumniSinceDate,
        affiliationOptions: toUserAffiliationOptions(user),
      },
    }),
  ),
  ...hits
    .filter((hit): hit is ExternalAuthorHit => !isUserHit(hit))
    .map(
      (externalAuthor): SpeakerSearchOption => ({
        value: externalAuthor.id,
        label: externalAuthor.displayName,
        externalAuthor: {
          id: externalAuthor.id,
          displayName: externalAuthor.displayName,
        },
      }),
    ),
];
