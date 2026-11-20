import { UserResponse } from './user';

export type DiscoverDataObject = {
  aboutUs: string;
  members: UserResponse[];
  membersTeamId?: string;
  scientificAdvisoryBoard: UserResponse[];
};

export type DiscoverResponse = DiscoverDataObject;

export type AsapAreaMember = Pick<
  UserResponse,
  'id' | 'firstName' | 'lastName' | 'displayName' | 'avatarUrl'
>;

export type AsapAreaDataObject = {
  id: string;
  name: string;
  objective: string;
  primaryEmail: string;
  secondaryEmail?: string;
  members: AsapAreaMember[];
};

export type AsapAreaResponse = AsapAreaDataObject;
