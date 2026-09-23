import { htmlToCsvText } from '@asap-hub/frontend-utils';
import { UserListItemResponse } from '@asap-hub/model';

export const MAX_ALGOLIA_RESULTS = 1000;

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
  'Research ID': user.social?.researcherId || '',
  LinkedIn: user.social?.linkedIn || '',
  BlueSky: user.social?.blueSky || '',
  Twitter: user.social?.twitter || '',
  GitHub: user.social?.github || '',
  'Google Scholar': user.social?.googleScholar || '',
  'Research Gate': user.social?.researchGate || '',
});
