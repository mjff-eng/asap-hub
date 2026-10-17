import { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import { createResearchOutputResponse } from '@asap-hub/fixtures';

import GrantDocumentHeaderCard from '../GrantDocumentHeaderCard';

const props: ComponentProps<typeof GrantDocumentHeaderCard> = {
  ...createResearchOutputResponse(),
  title: 'Grant title',
  documentType: 'Grant Document',
  teams: [{ id: 'team-1', displayName: 'Alpha' }],
  addedDate: '2024-03-10T00:00:00.000Z',
  lastUpdatedPartial: '2024-06-20T00:00:00.000Z',
  grantType: 'supplement',
  project: {
    id: 'project-1',
    title: 'Project title',
    projectType: 'Discovery Project',
  },
};

describe('GrantDocumentHeaderCard', () => {
  it('renders the labels, title, project, team and dates', () => {
    render(<GrantDocumentHeaderCard {...props} />);

    expect(screen.getByText('Project Output')).toBeVisible();
    expect(screen.getByText('Grant Document')).toBeVisible();
    expect(screen.getByText('Supplement')).toBeVisible();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Grant title' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Project title' })).toHaveAttribute(
      'href',
      '/projects/discovery/project-1',
    );
    expect(screen.getByRole('link', { name: 'Team Alpha' })).toBeVisible();
    expect(screen.getByText('Date Added: 10th March 2024')).toBeVisible();
    expect(screen.getByText('Last updated: 20th June 2024')).toBeVisible();
  });

  it('omits the team row when there are no teams', () => {
    render(
      <GrantDocumentHeaderCard
        {...props}
        teams={[]}
        addedDate={undefined}
        created="2023-01-05T00:00:00.000Z"
      />,
    );

    expect(screen.queryByText(/Team /)).not.toBeInTheDocument();
    expect(screen.getByText('Date Added: 5th January 2023')).toBeVisible();
  });
});
