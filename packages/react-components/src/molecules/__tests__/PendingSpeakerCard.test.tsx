import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AffiliationOption } from '../ExternalSpeakerAffiliationCard';
import PendingSpeakerCard from '../PendingSpeakerCard';

const affiliations: AffiliationOption[] = [
  { variant: 'team', id: 'team-1', name: 'Team Alpha' },
  { variant: 'team', id: 'team-2', name: 'Team Beta' },
  { variant: 'project', id: 'project-1', name: 'Project One' },
];

const defaultProps = {
  displayName: 'Jane Doe',
  userId: 'user-1',
  affiliations,
  onPickAffiliation: jest.fn(),
  onDismiss: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

it('Should dismiss with a cross rather than a bin', () => {
  render(<PendingSpeakerCard {...defaultProps} />);

  expect(screen.getByTitle('Close')).toBeInTheDocument();
  expect(screen.queryByTitle('Remove')).not.toBeInTheDocument();
});

it('Should render the warning message and one pill per affiliation', () => {
  render(<PendingSpeakerCard {...defaultProps} />);

  expect(
    screen.getByText(/Multiple affiliations were found for this speaker/),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: /Team Alpha/ }),
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Team Beta/ })).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: /Project One/ }),
  ).toBeInTheDocument();
});

it('Should mark each pill with its team or project icon', () => {
  render(
    <PendingSpeakerCard
      {...defaultProps}
      affiliations={[
        { variant: 'team', id: 'team-1', name: 'Team Alpha' },
        {
          variant: 'team',
          id: 'team-2',
          name: 'Team Beta',
          teamType: 'Resource Team',
        },
        {
          variant: 'project',
          id: 'project-1',
          name: 'Project One',
          projectType: 'Trainee Project',
        },
      ]}
    />,
  );

  expect(screen.getByTitle('Team')).toBeInTheDocument();
  expect(screen.getByTitle('Resource Team Icon')).toBeInTheDocument();
  expect(screen.getByTitle('Trainee Project')).toBeInTheDocument();
});

it('Should call onPickAffiliation with the picked team', async () => {
  render(<PendingSpeakerCard {...defaultProps} />);

  await userEvent.click(screen.getByRole('button', { name: /Team Alpha/ }));

  expect(defaultProps.onPickAffiliation).toHaveBeenCalledWith(affiliations[0]);
});

it('Should call onPickAffiliation with the picked project', async () => {
  render(<PendingSpeakerCard {...defaultProps} />);

  await userEvent.click(screen.getByRole('button', { name: /Project One/ }));

  expect(defaultProps.onPickAffiliation).toHaveBeenCalledWith(affiliations[2]);
});

it('Should call onDismiss when the remove button is clicked', async () => {
  render(<PendingSpeakerCard {...defaultProps} />);

  await userEvent.click(
    screen.getByRole('button', { name: 'Remove Jane Doe' }),
  );

  expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
});

it('Should disable the remove button and affiliation pills when enabled is false', () => {
  render(<PendingSpeakerCard {...defaultProps} enabled={false} />);

  expect(
    screen.getByRole('button', { name: 'Remove Jane Doe' }),
  ).toBeDisabled();
  expect(screen.getByRole('button', { name: /Team Alpha/ })).toBeDisabled();
});

it('Should render a link to the user profile', () => {
  render(<PendingSpeakerCard {...defaultProps} />);

  const userLink = screen.getByRole('link', { name: 'Jane Doe' });
  expect(userLink).toHaveAttribute('href', expect.stringContaining('user-1'));
  expect(userLink).toHaveAttribute('target', '_blank');
});
