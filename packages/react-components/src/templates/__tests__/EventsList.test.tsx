import { ComponentProps } from 'react';
import { render } from '@testing-library/react';
import { createEventResponse } from '@asap-hub/fixtures';

import EventsList from '../EventsList';

const props = (
  events: ComponentProps<typeof EventsList>['events'],
): ComponentProps<typeof EventsList> => ({
  events,
  numberOfItems: events.length,
  numberOfPages: 1,
  currentPageIndex: 0,
  renderPageHref: (index) => `#${index}`,
});

it('renders multiple event cards', () => {
  const { getAllByRole } = render(
    <EventsList
      {...props([
        {
          ...createEventResponse({}, 0),
          tags: [],
          title: 'FirstEvent',
          eventOwner: <div>ASAP Team</div>,
          hasSpeakersToBeAnnounced: false,
        },
        {
          ...createEventResponse({}, 1),
          tags: [],
          title: 'SecondEvent',
          eventOwner: <div>ASAP Team</div>,
          hasSpeakersToBeAnnounced: false,
        },
      ])}
    />,
  );
  expect(getAllByRole('heading').map(({ textContent }) => textContent)).toEqual(
    ['FirstEvent', 'SecondEvent'],
  );
});

it('shows the online events notice only when asked to', () => {
  const event = {
    ...createEventResponse(),
    tags: [],
    eventOwner: <div>ASAP Team</div>,
    hasSpeakersToBeAnnounced: false,
  };
  const { queryByText, rerender } = render(<EventsList {...props([event])} />);
  expect(queryByText(/Events are online by default/)).not.toBeInTheDocument();

  rerender(<EventsList {...props([event])} showOnlineEventsNotice />);
  expect(queryByText(/Events are online by default/)).toBeVisible();
});
