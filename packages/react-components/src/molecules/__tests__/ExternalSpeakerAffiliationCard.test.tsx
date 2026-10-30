import { render, screen, waitFor } from '@testing-library/react';
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
  loadAffiliationOptions: jest.fn(async () => affiliationOptions),
  onSelectAffiliation: jest.fn(),
  onKeepAsExternalGuest: jest.fn(),
  onDismiss: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  defaultProps.loadAffiliationOptions.mockImplementation(
    async () => affiliationOptions,
  );
});

const selectOption = async (name: string) => {
  await userEvent.type(screen.getByRole('combobox'), name.slice(0, 3));
  await userEvent.click(await screen.findByText(name));
};

it('Should dismiss with a cross rather than a bin', () => {
  render(<ExternalSpeakerAffiliationCard {...defaultProps} />);

  expect(screen.getByTitle('Close')).toBeInTheDocument();
  expect(screen.queryByTitle('Remove')).not.toBeInTheDocument();
});

it('Should render the external placeholder avatar beside the name', () => {
  render(<ExternalSpeakerAffiliationCard {...defaultProps} />);

  expect(screen.getByTitle('External user')).toBeInTheDocument();
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

it('Should search teams and projects with the typed text', async () => {
  render(<ExternalSpeakerAffiliationCard {...defaultProps} />);

  await userEvent.type(screen.getByRole('combobox'), 'Alp');

  await waitFor(() =>
    expect(defaultProps.loadAffiliationOptions).toHaveBeenLastCalledWith('Alp'),
  );
});

it('Should tell when the search finds no team or project', async () => {
  defaultProps.loadAffiliationOptions.mockImplementation(async () => []);
  render(<ExternalSpeakerAffiliationCard {...defaultProps} />);

  await userEvent.type(screen.getByRole('combobox'), 'Zeta');

  expect(await screen.findByText('Sorry, no matches for Zeta.')).toBeVisible();
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
  defaultProps.loadAffiliationOptions.mockImplementation(async () => [
    { id: 'shared-1', name: 'Team Alpha', variant: 'team' },
    { id: 'shared-1', name: 'Project Beta', variant: 'project' },
  ]);
  render(<ExternalSpeakerAffiliationCard {...defaultProps} />);

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
