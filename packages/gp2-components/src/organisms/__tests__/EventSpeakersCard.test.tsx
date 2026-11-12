import { gp2 } from '@asap-hub/fixtures';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import EventSpeakersCard from '../EventSpeakersCard';

const {
  createInternalSpeakerResponse,
  createExternalSpeakerResponse,
  createSpeakerToBeAnnounced,
} = gp2;

it('renders the title and the column headers', () => {
  render(<EventSpeakersCard speakers={[createInternalSpeakerResponse()]} />);
  expect(screen.getByRole('heading', { name: 'Speakers' })).toBeVisible();
  expect(screen.getByText('Speaker')).toBeInTheDocument();
});

it('links an internal speaker to their profile', () => {
  render(<EventSpeakersCard speakers={[createInternalSpeakerResponse(1)]} />);
  const table = screen.getByTestId('event-speakers');
  expect(
    within(table).getByRole('link', { name: /John Doe 1/ }),
  ).toHaveAttribute('href', expect.stringContaining('user-id-1'));
  expect(within(table).getByText('Some Topic')).toBeInTheDocument();
});

it('renders an external speaker and a speaker to be announced', () => {
  render(
    <EventSpeakersCard
      speakers={[createExternalSpeakerResponse(), createSpeakerToBeAnnounced()]}
    />,
  );
  expect(
    screen.getByRole('button', { name: 'Show details for John' }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Show details for To be announced' }),
  ).toBeInTheDocument();
  expect(
    within(screen.getByTestId('event-speakers')).getByText('—'),
  ).toBeInTheDocument();
});

it('starts with every speaker collapsed and expands one at a time', async () => {
  render(
    <EventSpeakersCard
      speakers={[
        createInternalSpeakerResponse(0),
        createInternalSpeakerResponse(1),
      ]}
    />,
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Show details for John Doe 0' }),
  );
  expect(
    screen.getByRole('button', { name: 'Hide details for John Doe 0' }),
  ).toHaveAttribute('aria-expanded', 'true');
  expect(
    screen.getByRole('button', { name: 'Show details for John Doe 1' }),
  ).toHaveAttribute('aria-expanded', 'false');
});
