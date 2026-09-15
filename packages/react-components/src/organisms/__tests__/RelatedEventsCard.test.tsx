import { createListEventResponse } from '@asap-hub/fixtures';
import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RelatedEventsCard from '../RelatedEventsCard';

it('renders the related events card with no events message', () => {
  render(<RelatedEventsCard relatedEvents={[]} />);
  expect(screen.getByRole('heading', { level: 3 }).textContent).toMatch(
    /Events/i,
  );
  expect(screen.getByText(/No related/i)).toBeInTheDocument();
});

it('truncates the related events card', () => {
  const { rerender } = render(
    <RelatedEventsCard
      relatedEvents={createListEventResponse(5).items.map((event, i) => ({
        ...event,
        title: `Example ${i} `,
      }))}
    />,
  );
  expect(screen.getByText(/Find all related Events/i)).toBeInTheDocument();
  expect(screen.getAllByText(/Example/i)).toHaveLength(5);
  rerender(
    <RelatedEventsCard
      relatedEvents={createListEventResponse(5).items.map((event, i) => ({
        ...event,
        title: `Example ${i}`,
      }))}
      truncateFrom={3}
    />,
  );
  expect(screen.getAllByText(/Example/i)).toHaveLength(3);
});

it('can show hide events', async () => {
  render(
    <RelatedEventsCard
      relatedEvents={createListEventResponse(5).items.map((event, i) => ({
        ...event,
        title: `Example ${i}`,
      }))}
      truncateFrom={3}
    />,
  );
  expect(screen.getAllByText(/Example/i)).toHaveLength(3);
  await userEvent.click(
    screen.getByRole('button', { name: /View More Events/i }),
  );
  expect(screen.getAllByText(/Example/i)).toHaveLength(5);
  await userEvent.click(
    screen.getByRole('button', { name: /View Less Events/i }),
  );
  expect(screen.getAllByText(/Example/i)).toHaveLength(3);
});
