import { fireEvent, render, screen } from '@testing-library/react';

import CalendarHubUpdates from '../CalendarHubUpdates';

it('renders nothing without a calendar', () => {
  const { container } = render(<CalendarHubUpdates />);
  expect(container).toBeEmptyDOMElement();
});

it('renders the title, the description and a subscribe button', () => {
  render(
    <CalendarHubUpdates
      calendar={{ id: 'hub@asap.science', name: 'ASAP Hub', color: '#B1365F' }}
    />,
  );

  expect(
    screen.getByRole('heading', { name: 'CRN Hub Updates' }),
  ).toBeVisible();
  expect(
    screen.getByText(/Subscribe to the official CRN calendar/i),
  ).toBeVisible();
  expect(screen.queryByText('ASAP Hub')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /subscribe/i }));
  expect(
    screen.getByRole('link', { name: /Add to Google Calendar/i }),
  ).toHaveAttribute(
    'href',
    'https://calendar.google.com/calendar/r?cid=hub%40asap.science',
  );
});
