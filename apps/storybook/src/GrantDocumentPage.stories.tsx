import { ComponentProps } from 'react';
import { Decorator } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import { createResearchOutputResponse } from '@asap-hub/fixtures';
import { SharedResearchOutput } from '@asap-hub/react-components';

const RouterDecorator: Decorator = (storyFn) => (
  <MemoryRouter>{storyFn()}</MemoryRouter>
);

export default {
  title: 'Templates / Shared Research / Grant Document',
  decorators: [RouterDecorator],
};

const project = {
  id: 'project-1',
  title: 'Discovery Project Title',
  projectType: 'Discovery Project' as const,
};

const originalGrant = {
  researchOutputId: 'original-output',
  title: 'Understanding the molecular mechanisms of Parkinson’s disease',
  description:
    'We hypothesize that the functions of multiple Parkinson’s disease genes converge on common biochemical pathways involving endocytic organelles and/or mitochondria within vulnerable cell types.',
  startDate: '2021-01-01T00:00:00.000Z',
  endDate: '2024-12-31T00:00:00.000Z',
};

const supplementGrant = {
  researchOutputId: 'supplement-output',
  title: 'Supplement grant title',
  description:
    'The supplement extends the original aims to patient-derived neurons.',
  startDate: '2025-01-01T00:00:00.000-08:00',
  endDate: '2099-12-31T00:00:00.000-08:00',
};

const props = (): ComponentProps<typeof SharedResearchOutput> => ({
  ...createResearchOutputResponse(),
  id: 'original-output',
  documentType: 'Grant Document',
  type: 'Proposal',
  title: 'Understanding the molecular mechanisms of Parkinson’s disease',
  link: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf',
  publishingEntity: 'Project',
  keywords: ['Neurodegeneration', 'Mitochondria', 'Endocytosis'],
  backHref: '#',
  checkForNewVersion: () => Promise.resolve(false),
});

export const OriginalOnly = () => (
  <SharedResearchOutput
    {...props()}
    grantDocument={{
      grantType: 'original',
      project,
      original: { ...originalGrant, endDate: undefined },
    }}
  />
);

export const OriginalWithSupplement = () => (
  <SharedResearchOutput
    {...props()}
    grantDocument={{
      grantType: 'original',
      project,
      original: originalGrant,
      supplement: supplementGrant,
    }}
  />
);

export const Supplement = () => (
  <SharedResearchOutput
    {...props()}
    id="supplement-output"
    grantDocument={{
      grantType: 'supplement',
      project,
      original: originalGrant,
      supplement: supplementGrant,
    }}
  />
);

export const GrantEnded = () => (
  <SharedResearchOutput
    {...props()}
    grantDocument={{ grantType: 'original', project, original: originalGrant }}
    grantEnded
  />
);
