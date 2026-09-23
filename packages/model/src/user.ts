import { FetchOptions, ListResponse, OrcidWork } from './common';
import { InterestGroupMembership } from './interest-group';
import { LabResponse } from './lab';
import { ProjectType } from './project';
import { ResearchTagDataObject } from './research-tag';
import { TeamRole } from './team';
import { WorkingGroupMembership } from './working-group';

export const userRole = ['Staff', 'Grantee', 'Guest', 'Hidden'] as const;
export type Role = (typeof userRole)[number];

export const activeUserMembershipStatus = 'CRN Member';
export const inactiveUserMembershipStatus = 'Alumni Member';
export const userMembershipStatus = [
  activeUserMembershipStatus,
  inactiveUserMembershipStatus,
] as const;
export type UserMembershipStatus = (typeof userMembershipStatus)[number];

export const userDegree = [
  'BA',
  'BSc',
  'MSc',
  'PhD',
  'MD',
  'MD, PhD',
  'MPH',
  'MA',
  'MBA',
] as const;
export type UserDegree = (typeof userDegree)[number];

export const isUserRole = (data: string): data is Role =>
  (userRole as ReadonlyArray<string>).includes(data);

export const isUserDegree = (data: string): data is UserDegree =>
  (userDegree as ReadonlyArray<string>).includes(data);
export interface Invitee {
  avatarUrl?: string;
  biography?: string;
  city?: string;
  country?: string;
  email: string;
  firstName: string;
  institution?: string;
  jobTitle?: string;
  lastName: string;
  middleName?: string;
  nickname?: string;
}

export interface UserAward {
  name: string;
  date: string;
  iconUrl?: string;
  smallIconUrl?: string;
}

export interface UserTeam {
  id: string;
  displayName?: string;
  teamInactiveSince?: string;
  proposal?: string;
  role: TeamRole;
  inactiveSinceDate?: string;
  awards?: UserAward[];
}

export interface UserProjectMembership {
  id: string;
  title: string;
  projectType: ProjectType;
  status: string;
}

export interface UserSocialLinks {
  website1?: string;
  website2?: string;
  linkedIn?: string;
  orcid?: string;
  researcherId?: string;
  twitter?: string;
  blueSky?: string;
  github?: string;
  googleScholar?: string;
  researchGate?: string;
}

export interface Connection {
  code: string;
}

export interface UserDataObject extends Invitee {
  activeCampaignId?: string;
  membershipStatus?: UserMembershipStatus[];
  alumniLastUpdated?: string;
  alumniLocation?: string;
  alumniSinceDate?: string;
  connections?: Connection[];
  contactEmail?: string;
  personalEmail?: string;
  createdDate: string;
  degree?: UserDegree;
  dismissedGettingStarted?: boolean;
  expertiseAndResourceDescription?: string;
  id: string;
  inactiveSinceDate?: string;
  labs: LabResponse[];
  lastModifiedDate: string;
  onboarded?: boolean | null;
  orcid?: string;
  orcidLastModifiedDate?: string;
  orcidLastSyncDate?: string;
  orcidWorks?: OrcidWork[];
  questions: string[];
  reachOut?: string;
  researchInterests?: string;
  researchOutputs?: string[];
  responsibilities?: string;
  role: Role;
  openScienceTeamMember: boolean;
  techSupport: boolean;
  social?: UserSocialLinks;
  stateOrProvince?: string;
  teams: UserTeam[];
  workingGroups: WorkingGroupMembership[];
  interestGroups: InterestGroupMembership[];
  projects: UserProjectMembership[];
  tags?: Pick<ResearchTagDataObject, 'id' | 'name'>[];
  researchTheme?: string[];
}

export interface PublicUserTeam {
  displayName: string;
  role: TeamRole;
}

export type PublicUserDataObject = Pick<
  UserDataObject,
  | 'avatarUrl'
  | 'biography'
  | 'city'
  | 'country'
  | 'createdDate'
  | 'degree'
  | 'firstName'
  | 'lastName'
  | 'id'
  | 'institution'
  | 'interestGroups'
  | 'labs'
  | 'lastModifiedDate'
  | 'orcid'
  | 'personalEmail'
  | 'researchOutputs'
  | 'researchTheme'
  | 'social'
> & {
  alumni: 'Yes' | 'No';
  teams: PublicUserTeam[];
  tags: string[];
  workingGroups: Pick<WorkingGroupMembership, 'name' | 'role'>[];
};

export interface UserResponse
  extends Omit<UserDataObject, 'onboarded' | 'connections'> {
  onboarded: boolean;
  displayName: string;
  fullDisplayName: string;
}

export interface PublicUserResponse
  extends Omit<PublicUserDataObject, 'interestGroups' | 'orcid' | 'social'>,
    UserSocialLinks {
  interestGroups: Pick<InterestGroupMembership, 'name'>[];
  researchOutputs: string[];
}

export type UserListItemTeam = Pick<
  UserTeam,
  'id' | 'displayName' | 'role' | 'awards'
>;
export type UserListItemDataObject = Pick<
  UserDataObject,
  | 'alumniSinceDate'
  | 'avatarUrl'
  | 'biography'
  | 'city'
  | 'contactEmail'
  | 'stateOrProvince'
  | 'country'
  | 'createdDate'
  | 'degree'
  | 'dismissedGettingStarted'
  | 'email'
  | 'firstName'
  | 'id'
  | 'institution'
  | 'jobTitle'
  | 'labs'
  | 'lastName'
  | 'membershipStatus'
  | 'middleName'
  | 'nickname'
  | 'onboarded'
  | 'orcid'
  | 'role'
  | 'openScienceTeamMember'
  | 'techSupport'
  | 'social'
  | 'tags'
> & {
  _tags: string[];
  teams: UserListItemTeam[];
};
export type ListUserDataObject = ListResponse<UserListItemDataObject>;
export type ListPublicUserDataObject = ListResponse<PublicUserDataObject>;

export type UserListItemResponse = UserListItemDataObject & {
  displayName: string;
  fullDisplayName: string;
  onboarded: boolean;
};

export type UserMetadataResponse = Omit<
  UserResponse,
  'labs' | 'fullDisplayName'
> & {
  algoliaApiKey: string | null;
};

export type UserCreateDataObject = {
  avatar?: string | null;
  biography?: string;
  city?: string;
  connections?: Connection[];
  contactEmail?: string;
  personalEmail?: string;
  country?: string;
  degree?: UserDegree | '';
  dismissedGettingStarted?: boolean;
  email: string;
  expertiseAndResourceDescription?: string;
  firstName: string;
  institution?: string;
  jobTitle?: string;
  labIds: string[];
  lastName: string;
  middleName?: string;
  nickname?: string;
  onboarded?: boolean;
  orcid?: string;
  orcidLastModifiedDate?: string;
  orcidLastSyncDate?: string;
  orcidWorks?: OrcidWork[];
  questions?: string[];
  reachOut?: string;
  researchInterests?: string;
  responsibilities?: string;
  role: Role;
  social?: Omit<UserSocialLinks, 'orcid'>;
  stateOrProvince?: string;
  teams?: Pick<UserTeam, 'id' | 'role' | 'inactiveSinceDate'>[];
  tagIds?: string[];
};

export type UserUpdateDataObject = Partial<UserCreateDataObject> & {
  activeCampaignCreatedAt?: Date;
  activeCampaignId?: string;
};

export type UserUpdateRequest = UserUpdateDataObject;
export type UserPatchRequest = Omit<
  UserUpdateDataObject,
  | 'avatar'
  | 'connections'
  | 'orcidLastModifiedDate'
  | 'email'
  | 'labIds'
  | 'orcid'
  | 'orcidLastSyncDate'
  | 'orcidWorks'
  | 'role'
  | 'activeCampaignCreatedAt'
  | 'activeCampaignId'
>;

export interface UserAvatarPostRequest {
  avatar: string;
}

export type ListUserResponse = ListResponse<UserListItemResponse>;
export type ListPublicUserResponse = ListResponse<PublicUserResponse>;

export type FetchUsersFilter =
  | {
      labId?: never;
      role?: never;
      teamId?: never;
      teamMembershipId?: never;
      code?: string;
      hidden?: boolean;
      onboarded?: boolean;
      orcid?: string;
      orcidLastSyncDate?: string;
    }
  | {
      labId?: string;
      role?: never;
      teamId?: never;
      teamMembershipId?: never;
      code?: never;
      hidden?: never;
      onboarded?: never;
      orcid?: never;
      orcidLastSyncDate?: string;
    }
  | {
      labId?: never;
      role?: string[];
      teamId?: string;
      teamMembershipId?: never;
      code?: never;
      hidden?: never;
      onboarded?: never;
      orcid?: never;
      orcidLastSyncDate?: string;
    }
  | {
      labId?: never;
      role?: never;
      teamId?: never;
      teamMembershipId?: string;
      code?: never;
      hidden?: never;
      onboarded?: never;
      orcid?: never;
      orcidLastSyncDate?: string;
    };

export type FetchUsersOptions = FetchOptions<FetchUsersFilter>;

export type UserRole = 'Staff' | 'Member' | 'None';

export const toUserListItem = (user: UserResponse): UserListItemResponse => {
  const {
    alumniSinceDate,
    avatarUrl,
    biography,
    city,
    contactEmail,
    stateOrProvince,
    country,
    createdDate,
    degree,
    dismissedGettingStarted,
    displayName,
    fullDisplayName,
    email,
    tags,
    firstName,
    id,
    institution,
    jobTitle,
    labs,
    lastName,
    membershipStatus,
    middleName,
    nickname,
    onboarded,
    orcid,
    role,
    openScienceTeamMember,
    techSupport,
    social,
    teams,
  } = user;

  return {
    alumniSinceDate,
    avatarUrl,
    biography,
    city,
    contactEmail,
    stateOrProvince,
    country,
    createdDate,
    degree,
    dismissedGettingStarted,
    displayName,
    fullDisplayName,
    email,
    tags,
    firstName,
    id,
    institution,
    jobTitle,
    labs,
    lastName,
    membershipStatus,
    middleName,
    nickname,
    onboarded,
    orcid,
    role,
    openScienceTeamMember,
    techSupport,
    social,
    teams: teams.map((teamItem) => ({
      id: teamItem.id,
      role: teamItem.role,
      displayName: teamItem.displayName,
      ...(teamItem.awards ? { awards: teamItem.awards } : {}),
    })),
    _tags: tags?.map(({ name }) => name) || [],
  };
};

export type UserAwardWithTeam = UserAward & { teamName?: string };

export const getUserAwards = (
  teams: Pick<UserListItemTeam, 'displayName' | 'awards'>[] = [],
): UserAwardWithTeam[] =>
  teams
    .flatMap(
      (team) =>
        team.awards?.map((award) => ({
          ...award,
          teamName: team.displayName,
        })) ?? [],
    )
    // newest first across all teams so the badges card's "view more"
    // cut-off shows the latest awards regardless of which team they came from
    .sort((a, b) => b.date.localeCompare(a.date));

export const getLatestUserAward = (
  teams: Pick<UserListItemTeam, 'displayName' | 'awards'>[] = [],
): UserAwardWithTeam | undefined =>
  // getUserAwards is already sorted newest-first, so the head is the latest
  getUserAwards(teams)[0];
