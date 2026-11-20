import {
  ResearchOutputDocumentType,
  ResearchOutputEntityType,
} from '@asap-hub/model';
import { render, screen } from '@testing-library/react';

import ResearchOutputHeader from '../ResearchOutputHeader';

it.each<{
  documentType: ResearchOutputDocumentType;
  entityType: ResearchOutputEntityType;
  headingName: RegExp;
  subHeader: RegExp;
}>([
  {
    documentType: 'Article',
    entityType: 'team',
    headingName: /Share a Team Article/i,
    subHeader: /published article/,
  },
  {
    documentType: 'Protocol',
    entityType: 'team',
    headingName: /Share a Team Protocol/i,
    subHeader: /Add your protocol/,
  },
  {
    documentType: 'Dataset',
    entityType: 'team',
    headingName: /Share a Team Dataset/i,
    subHeader: /Add your dataset/,
  },
  {
    documentType: 'Bioinformatics',
    entityType: 'team',
    headingName: /Share Team Bioinformatics/i,
    subHeader: /Add bioinformatics/,
  },
  {
    documentType: 'Lab Material',
    entityType: 'team',
    headingName: /Share a Team Lab Material/i,
    subHeader: /Add your lab material/,
  },
  {
    documentType: 'Article',
    entityType: 'working-group',
    headingName: /Share a Working Group Article/i,
    subHeader: /published article/,
  },
  {
    documentType: 'Report',
    entityType: 'working-group',
    headingName: /Share a Working Group CRN Report/i,
    subHeader: /add your CRN report/,
  },
])(
  'renders the $documentType $entityType research output',
  ({ documentType, headingName, subHeader, entityType }) => {
    render(
      <ResearchOutputHeader
        entityType={entityType}
        documentType={documentType}
      />,
    );
    expect(
      screen.getByRole('heading', { name: headingName }),
    ).toBeInTheDocument();
    expect(screen.getByText(subHeader)).toBeInTheDocument();
  },
);

it('renders a Project header for a team-based project output', () => {
  render(
    <ResearchOutputHeader
      entityType="team"
      documentType="Article"
      isProjectOutput
    />,
  );
  expect(
    screen.getByRole('heading', { name: /Share a Project Article/i }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('heading', { name: /Team/i }),
  ).not.toBeInTheDocument();
});

it('does not render breadcrumbs by default', () => {
  render(<ResearchOutputHeader entityType="project" documentType="Article" />);
  expect(
    screen.queryByRole('navigation', { name: 'breadcrumbs' }),
  ).not.toBeInTheDocument();
});

it.each<{
  documentType: ResearchOutputDocumentType;
  entityType: ResearchOutputEntityType;
  label: string;
}>([
  {
    documentType: 'Protocol',
    entityType: 'project',
    label: 'Share a Protocol',
  },
  { documentType: 'Article', entityType: 'project', label: 'Share an Article' },
  {
    documentType: 'Bioinformatics',
    entityType: 'project',
    label: 'Share Bioinformatics',
  },
  { documentType: 'Report', entityType: 'project', label: 'Share a Report' },
  {
    documentType: 'Report',
    entityType: 'working-group',
    label: 'Share a CRN Report',
  },
])(
  'renders the breadcrumbs ending in $label for a $entityType $documentType',
  ({ documentType, entityType, label }) => {
    render(
      <ResearchOutputHeader
        entityType={entityType}
        documentType={documentType}
        breadcrumbs={[
          { label: 'Discovery Projects', href: '/projects/discovery' },
          { label: 'Project Title', href: '/projects/discovery/1/about' },
        ]}
      />,
    );
    expect(
      screen.getByRole('navigation', { name: 'breadcrumbs' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Discovery Projects' }),
    ).toHaveAttribute('href', '/projects/discovery');
    expect(screen.getByRole('link', { name: 'Project Title' })).toHaveAttribute(
      'href',
      '/projects/discovery/1/about',
    );
    expect(screen.getByText(label)).toHaveAttribute('aria-current', 'page');
  },
);
