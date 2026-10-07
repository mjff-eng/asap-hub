export type ContentfulWebhookPayloadType =
  | 'calendars'
  | 'events'
  | 'externalAuthors'
  | 'interestGroups'
  | 'interestGroupsTeams'
  | 'labs'
  | 'manuscripts'
  | 'manuscriptVersions'
  | 'news'
  | 'projects'
  | 'researchOutputs'
  | 'teams'
  | 'users'
  | 'workingGroups'
  | 'tutorials'
  | 'teamMembership'
  | 'aims'
  | 'milestones'
  | 'supplementGrant'
  | 'complianceReports'
  | 'impact'
  | 'category';

type CapitalizeFirstLetter<S extends string> =
  S extends `${infer First}${infer Rest}` ? `${Uppercase<First>}${Rest}` : S;

export type WebhookPayloadTypeFirstLetterCapitalized =
  CapitalizeFirstLetter<ContentfulWebhookPayloadType>;
