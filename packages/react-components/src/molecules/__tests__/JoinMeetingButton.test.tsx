import { fireEvent, render, screen } from '@testing-library/react';

import JoinMeetingButton from '../JoinMeetingButton';

it('links to the meeting when the meeting link is valid', () => {
  render(<JoinMeetingButton meetingLink="https://example.com/meeting" />);

  expect(screen.getByText('Join Meeting Now').closest('a')).toHaveAttribute(
    'href',
    'https://example.com/meeting',
  );
  expect(
    screen.queryByRole('tooltip', { hidden: true }),
  ).not.toBeInTheDocument();
});

it.each`
  description  | meetingLink
  ${'missing'} | ${undefined}
  ${'empty'}   | ${''}
  ${'invalid'} | ${'not a link'}
`(
  'disables the button when the meeting link is $description',
  ({ meetingLink }) => {
    render(<JoinMeetingButton meetingLink={meetingLink} />);

    expect(
      screen.getByText('Join Meeting Now').closest('a'),
    ).not.toHaveAttribute('href');
  },
);

it('shows the missing link tooltip on hover when the button is disabled', () => {
  render(<JoinMeetingButton />);
  const button = screen.getByText('Join Meeting Now');
  const tooltip = screen.getByRole('tooltip', { hidden: true });

  expect(tooltip).toHaveTextContent(
    'We’re sorry but we couldn’t find the link to this event.Please contact ASAP for more information.',
  );
  expect(tooltip).not.toBeVisible();

  fireEvent.mouseEnter(button);
  expect(tooltip).toBeVisible();

  fireEvent.mouseLeave(button);
  expect(tooltip).not.toBeVisible();
});
