import { ComponentProps } from 'react';
import { Decorator } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import { SharedResearchOutput } from '@asap-hub/react-components';
import { ResearchOutputPermissionsContext } from '@asap-hub/react-context';

import {
  createLabs,
  createListResearchOutputResponse,
  createListTeamResponse,
  createListUserResponse,
  createResearchOutputResponse,
  createWorkingGroupResponse,
} from '@asap-hub/fixtures';
import {
  ExternalAuthorResponse,
  ResearchOutputSharingStatus,
} from '@asap-hub/model';

import { array, boolean, date, number, select, text } from './knobs';

// SharedResearchOutput calls useNavigate(), so it needs a router in scope.
const RouterDecorator: Decorator = (storyFn) => (
  <MemoryRouter>{storyFn()}</MemoryRouter>
);

export default {
  title: 'Templates / Shared Research / Details',
  decorators: [RouterDecorator],
};

const props = (): ComponentProps<typeof SharedResearchOutput> => ({
  ...createResearchOutputResponse(),
  documentType: 'Article',
  title: text(
    'Title',
    'Molecular actions of PD-associated pathological proteins using in vitro human pluripotent stem cell-derived brain',
  ),
  link: text('Link', 'http://example.com'),
  keywords: array('Keywords', ['Tag 1', 'Tag 2', 'Tag 3', 'Tag 4', 'Tag 5']),
  usageNotes: text(
    'Access Instructions',
    'If you need many people to view a file at once, publish it and create a link to share to viewers. You can give edit access to people who need to edit or comment. Up to 100 people with view, edit, or comment permissions can work at the same time. When more than 100 people are accessing a file, only the owner and some users with editing permissions can edit the file.',
  ),
  sharingStatus: select<ResearchOutputSharingStatus>(
    'Sharing Status',
    ['Public', 'Network Only'],
    'Public',
  ),
  asapFunded: select<boolean | undefined>(
    'ASAP-funded',
    { Unknown: undefined, Yes: true, No: false },
    undefined,
  ),
  usedInPublication: select<boolean | undefined>(
    'Used in a publication',
    { Unknown: undefined, Yes: true, No: false },
    undefined,
  ),
  doi: text('DOI', '10.1101/gr.10.12.1841'),
  rrid: text('RRID', 'RRID:SCR_007358'),
  accession: text('Accession #', 'NC_000001.11'),
  labCatalogNumber: text('Lab Catalog Number', 'https://example.com'),
  addedDate: new Date(
    date('Added Date', new Date(2020, 3, 10, 10, 54)),
  ).toISOString(),
  lastUpdatedPartial: new Date(
    date('Last Updated Date', new Date(2020, 6, 12, 14, 32)),
  ).toISOString(),
  backHref: '#',
  teams: createListTeamResponse(number('Number of teams', 3)).items,
  contactEmails: boolean('Show Contact CTA', true)
    ? ['example@example.com']
    : [],
  authors: [
    ...createListUserResponse(number('Number of authors', 2)).items,
    ...Array.from({ length: number('Number of external authors', 1) }).map(
      (_, i): ExternalAuthorResponse => ({
        id: `external-author-${i + 1}`,
        displayName: `External Author ${i + 1}`,
      }),
    ),
  ],
  labs: createLabs({ labs: number('Number of labs', 2) }),
  workingGroups: number('Number of Working Groups', 0, { max: 1 })
    ? [createWorkingGroupResponse()]
    : undefined,
  relatedResearch: createListResearchOutputResponse(
    number('Number of related research items', 0),
  ).items.map(
    ({ documentType, id, title, type, teams, workingGroups = [] }) => ({
      documentType,
      id,
      title,
      type,
      teams,
      workingGroups,
    }),
  ),
  published: boolean('Published', true),
  toast: select<ComponentProps<typeof SharedResearchOutput>['toast']>(
    'Toast',
    {
      None: undefined,
      Published: 'published',
      'Draft created': 'draftCreated',
    },
    undefined,
  ),
  statusChangedBy: {
    id: 'userId',
    firstName: 'firstName',
    lastName: 'lastName',
  },
  isInReview: false,
  checkForNewVersion: () => Promise.resolve(false),
});

export const Normal = () => (
  <ResearchOutputPermissionsContext.Provider
    value={{
      canShareResearchOutput: true,
      canEditResearchOutput: true,
      canPublishResearchOutput: true,
    }}
  >
    <SharedResearchOutput
      {...props()}
      description={text(
        'Description',
        `Neural control of muscle function is fundamental to animal behavior. In many cases, specific muscles can generate multiple distinct behaviors. Nonetheless, individual muscle cells are generally regarded as the smallest units of motor control. Here we report that muscle cells can alter their behavioral output by contracting subcellularly.
    <b>Bold Text</b> <a href="http://example.com"> link </a>
    `,
      )}
    />
  </ResearchOutputPermissionsContext.Provider>
);
