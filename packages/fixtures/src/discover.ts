import { DiscoverResponse } from '@asap-hub/model';
import { createUserResponse } from './users';

export const createDiscoverResponse = (): DiscoverResponse => ({
  aboutUs: '<h1>About us</h1>',
  members: [createUserResponse()],
  scientificAdvisoryBoard: [createUserResponse()],
  cnsQuestMembers: [],
  asapAreas: [],
});
