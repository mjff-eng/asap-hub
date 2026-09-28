import { htmlToCsvText } from '@asap-hub/frontend-utils';
import { UserListItemResponse } from '@asap-hub/model';
import {
  toUserSocialUrl,
  UserSocialProfileType,
} from '@asap-hub/react-components';

export const MAX_ALGOLIA_RESULTS = 1000;

const socialUrl = (
  value: string | undefined,
  type: UserSocialProfileType,
): string => (value ? toUserSocialUrl(value, type) : '');

export const userToCSV = (user: UserListItemResponse) => ({
  'First Name': user.firstName,
  'Middle Name': user.middleName || '',
  'Last Name': user.lastName,
  Email: user.email,
  ORCID: user.orcid || '',
  Degree: user.degree || '',
  Country: user.country || '',
  State: user.stateOrProvince || '',
  City: user.city || '',
  'Job Title': user.jobTitle || '',
  Institution: user.institution || '',
  'Correspondence Email': user.contactEmail || '',
  Tags:
    user.tags
      ?.map((tag) => tag.name)
      .sort()
      .join(', ') || '',
  Biography: htmlToCsvText(user.biography),
  'Open Science Member': user.openScienceTeamMember ? 'Yes' : 'No',
  'Alumni Since Date': user.alumniSinceDate || '',
  'Team Name': user.teams.map((t) => t.displayName).join(', '),
  Role: user.teams.map((t) => t.role).join(', '),
  'Website 1': user.social?.website1 || '',
  'Website 2': user.social?.website2 || '',
  'Research ID': socialUrl(user.social?.researcherId, 'researcherId'),
  LinkedIn: socialUrl(user.social?.linkedIn, 'linkedIn'),
  BlueSky: socialUrl(user.social?.blueSky, 'blueSky'),
  Twitter: socialUrl(user.social?.twitter, 'twitter'),
  GitHub: socialUrl(user.social?.github, 'github'),
  'Google Scholar': socialUrl(user.social?.googleScholar, 'googleScholar'),
  'Research Gate': socialUrl(user.social?.researchGate, 'researchGate'),
});
