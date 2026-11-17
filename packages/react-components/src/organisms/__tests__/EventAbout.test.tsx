import { ComponentProps } from 'react';
import { render } from '@testing-library/react';
import { createEventResponse } from '@asap-hub/fixtures';
import { addDays, subDays } from 'date-fns';

import EventAbout from '../EventAbout';

const props: ComponentProps<typeof EventAbout> = {
  ...createEventResponse(),
  tags: [],
  endDate: addDays(new Date(), 1).toISOString(),
};

it('renders the event description', () => {
  const { getByText } = render(
    <EventAbout {...props} description={'<p>description</p>'} />,
  );
  expect(getByText(/About/i)).toBeVisible();
  expect(getByText('description')).toBeVisible();
});
it('omits the event description if empty', () => {
  const { queryByText } = render(
    <EventAbout {...props} description={undefined} />,
  );
  expect(queryByText(/About/i)).not.toBeInTheDocument();
});
it('collapses the event description after the event', () => {
  const { queryByText } = render(
    <EventAbout
      {...props}
      description={undefined}
      endDate={subDays(new Date(), 1).toISOString()}
    />,
  );
  expect(queryByText(/About/i)).not.toBeInTheDocument();
});

it('always shows the collapse toggle with the default variant', () => {
  const { getByRole } = render(
    <EventAbout {...props} description={'<p>description</p>'} />,
  );
  expect(getByRole('button', { name: /(show|hide) more/i })).toBeVisible();
});

it('hides the show more toggle with the expandable variant while the text fits', () => {
  const { getByText, queryByRole } = render(
    <EventAbout
      {...props}
      variant="expandable"
      description={'<p>description</p>'}
    />,
  );
  expect(getByText('description')).toBeVisible();
  expect(queryByRole('button')).not.toBeInTheDocument();
});

it('shows an empty state with the expandable variant when there is no description', () => {
  const { getByText } = render(
    <EventAbout
      {...props}
      variant="expandable"
      description={undefined}
      tags={['Tag A']}
    />,
  );
  expect(getByText('About this event')).toBeVisible();
  expect(
    getByText('No description has been added for this event yet.'),
  ).toBeVisible();
  expect(getByText('Tag A')).toBeVisible();
});

it('separates the description and tags with a divider in the expandable variant', () => {
  const { container } = render(
    <EventAbout
      {...props}
      variant="expandable"
      description={'<p>description</p>'}
      tags={['Tag A']}
    />,
  );
  expect(container.querySelector('hr')).toBeInTheDocument();
});

it('renders the event tags', () => {
  const { getByText } = render(<EventAbout {...props} tags={['Tag A']} />);
  expect(getByText(/tags/i)).toBeVisible();
  expect(getByText('Tag A')).toBeVisible();
});
it('omits the event tags of empty', () => {
  const { queryByText } = render(<EventAbout {...props} tags={[]} />);
  expect(queryByText(/tags/i)).not.toBeInTheDocument();
});
