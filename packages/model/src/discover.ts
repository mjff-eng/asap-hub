import { UserResponse } from './user';

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

export type DiscoverDataObject = {
  aboutUs: string;
  members: UserResponse[];
  membersTeamId?: string;
  scientificAdvisoryBoard: UserResponse[];
  asapAreas: AsapAreaDataObject[];
};

export type DiscoverResponse = DiscoverDataObject;
