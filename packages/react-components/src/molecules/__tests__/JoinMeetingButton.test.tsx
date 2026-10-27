import { fireEvent, render, screen } from '@testing-library/react';

import { colour } from '../../colors';
import { rem, tabletScreen } from '../../pixels';
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

describe('on a touch device', () => {
  const realMatchMedia = window.matchMedia;
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: jest.fn().mockReturnValue({ matches: false }),
    });
  });
  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: realMatchMedia,
    });
  });

  it('toggles the missing link tooltip on tap', () => {
    render(<JoinMeetingButton />);
    const button = screen.getByText('Join Meeting Now');
    const tooltip = screen.getByRole('tooltip', { hidden: true });

    fireEvent.mouseEnter(button);
    expect(tooltip).not.toBeVisible();

    fireEvent.click(button);
    expect(tooltip).toBeVisible();

    fireEvent.click(button);
    expect(tooltip).not.toBeVisible();
  });

  it('closes the missing link tooltip on a tap outside or Escape', () => {
    render(<JoinMeetingButton />);
    const button = screen.getByText('Join Meeting Now');
    const tooltip = screen.getByRole('tooltip', { hidden: true });

    fireEvent.click(button);
    fireEvent.mouseDown(document.body);
    expect(tooltip).not.toBeVisible();

    fireEvent.click(button);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(tooltip).not.toBeVisible();
  });
});

it.each`
  tooltipPosition | sibling
  ${undefined}    | ${'previousElementSibling'}
  ${'top'}        | ${'previousElementSibling'}
  ${'bottom'}     | ${'nextElementSibling'}
`(
  'renders the tooltip on the $tooltipPosition side of the button',
  ({ tooltipPosition, sibling }) => {
    render(<JoinMeetingButton tooltipPosition={tooltipPosition} />);
    const button = screen.getByText('Join Meeting Now').closest('a')!;
    expect(button[sibling as 'previousElementSibling']).toContainElement(
      screen.getByRole('tooltip', { hidden: true }),
    );
  },
);

it('styles the missing link tooltip with the event page design', () => {
  render(<JoinMeetingButton />);
  const tooltip = screen.getByRole('tooltip', { hidden: true });

  expect(tooltip).toHaveStyle({
    backgroundColor: colour.foreground['color-blue'],
  });
  expect(tooltip).toHaveStyleRule('max-width', rem(160), {
    media: `(max-width: ${tabletScreen.width - 1}px)`,
  });
  expect(tooltip).toHaveStyleRule('margin-left', '0', {
    media: `(max-width: ${tabletScreen.width - 1}px)`,
  });
  expect(tooltip).not.toHaveStyleRule('font-size', expect.anything());
  expect(tooltip.firstElementChild).toHaveStyleRule(
    'font-family',
    expect.stringMatching(/^'Nunito Sans', ?Roboto/),
  );
  expect(tooltip.firstElementChild).toHaveStyleRule('font-size', rem(14));
});
