import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ExternalSpeakerAffiliationCard, {
  AffiliationOption,
} from '../ExternalSpeakerAffiliationCard';

const affiliationOptions: ReadonlyArray<AffiliationOption> = [
  { id: 'team-1', name: 'Team Alpha', variant: 'team' },
  { id: 'project-1', name: 'Project Beta', variant: 'project' },
];

const defaultProps = {
  displayName: 'Jane Doe',
  affiliationOptions,
  onSelectAffiliation: jest.fn(),
  onKeepAsExternalGuest: jest.fn(),
  onDismiss: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

const selectOption = async (name: string) => {
  await userEvent.click(screen.getByRole('combobox'));
  await userEvent.click(screen.getByText(name));
};

it('Should dismiss with a cross rather than a bin', () => {
  render(<ExternalSpeakerAffiliationCard {...defaultProps} />);

  expect(screen.getByTitle('Close')).toBeInTheDocument();
  expect(screen.queryByTitle('Remove')).not.toBeInTheDocument();
});

it('Should render the external placeholder avatar beside the name', () => {
  render(<ExternalSpeakerAffiliationCard {...defaultProps} />);

  expect(screen.getByTitle('User Placeholder')).toBeInTheDocument();
});

it('Should render the speaker name, the Non CRN pill and the explanatory copy', () => {
  render(<ExternalSpeakerAffiliationCard {...defaultProps} />);

  expect(screen.getByText('Jane Doe')).toBeVisible();
  expect(screen.getByText('Non CRN')).toBeVisible();
  expect(
    screen.getByText(/not a member on any CRN team or individual project/),
  ).toBeVisible();
  expect(
    screen.getByText('This does not add them to a team or project.'),
  ).toBeVisible();
  expect(screen.getByRole('combobox')).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'Keep as External Guest' }),
  ).toBeVisible();
});

it('Should call onSelectAffiliation with the chosen team', async () => {
  render(<ExternalSpeakerAffiliationCard {...defaultProps} />);

  await selectOption('Team Alpha');

  expect(defaultProps.onSelectAffiliation).toHaveBeenCalledWith({
    id: 'team-1',
    name: 'Team Alpha',
    variant: 'team',
  });
});

it('Should call onSelectAffiliation with the chosen project', async () => {
  render(<ExternalSpeakerAffiliationCard {...defaultProps} />);

  await selectOption('Project Beta');

  expect(defaultProps.onSelectAffiliation).toHaveBeenCalledWith({
    id: 'project-1',
    name: 'Project Beta',
    variant: 'project',
  });
});

it('Should tell apart a team and a project that share an id', async () => {
  render(
    <ExternalSpeakerAffiliationCard
      {...defaultProps}
      affiliationOptions={[
        { id: 'shared-1', name: 'Team Alpha', variant: 'team' },
        { id: 'shared-1', name: 'Project Beta', variant: 'project' },
      ]}
    />,
  );

  await selectOption('Project Beta');

  expect(defaultProps.onSelectAffiliation).toHaveBeenCalledWith({
    id: 'shared-1',
    name: 'Project Beta',
    variant: 'project',
  });
});

it('Should call onKeepAsExternalGuest without an affiliation', async () => {
  render(<ExternalSpeakerAffiliationCard {...defaultProps} />);

  await userEvent.click(
    screen.getByRole('button', { name: 'Keep as External Guest' }),
  );

  expect(defaultProps.onKeepAsExternalGuest).toHaveBeenCalledTimes(1);
  expect(defaultProps.onSelectAffiliation).not.toHaveBeenCalled();
});

it('Should render no affiliation select and no "select a team" copy when there are no options', () => {
  render(
    <ExternalSpeakerAffiliationCard
      {...defaultProps}
      affiliationOptions={[]}
    />,
  );

  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  expect(
    screen.queryByText(/Select the team or project they represented/),
  ).not.toBeInTheDocument();
  expect(
    screen.getByText(/not a member on any CRN team or individual project/),
  ).toBeVisible();
  expect(
    screen.getByText('This does not add them to a team or project.'),
  ).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'Keep as External Guest' }),
  ).toBeVisible();
});

it('Should disable every control when not enabled', () => {
  render(<ExternalSpeakerAffiliationCard {...defaultProps} enabled={false} />);

  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Keep as External Guest' }),
  ).toBeDisabled();
  expect(
    screen.getByRole('button', { name: 'Remove Jane Doe' }),
  ).toBeDisabled();
});

it('Should call onDismiss when the dismiss button is clicked', async () => {
  render(<ExternalSpeakerAffiliationCard {...defaultProps} />);

  await userEvent.click(
    screen.getByRole('button', { name: 'Remove Jane Doe' }),
  );

  expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
});
