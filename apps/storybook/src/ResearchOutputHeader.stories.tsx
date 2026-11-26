import { researchOutputDocumentTypes } from '@asap-hub/model';
import { ResearchOutputHeader } from '@asap-hub/react-components';
import { Decorator } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import { select } from './knobs';

const RouterDecorator: Decorator = (storyFn) => (
  <MemoryRouter>{storyFn()}</MemoryRouter>
);

export default {
  title: 'Organisms / Research Output Header',
  component: ResearchOutputHeader,
  decorators: [RouterDecorator],
};

export const Normal = () => (
  <ResearchOutputHeader
    entityType={select(
      'Choose the entity type',
      ['team', 'working-group', 'project'],
      'working-group',
    )}
    documentType={select(
      'Choose document type',
      researchOutputDocumentTypes,
      'Article',
    )}
  />
);
