import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import EventSupport from '../EventSupport';

it('renders the tech support cta', () => {
  render(<EventSupport />);

  expect(
    screen.getByText('Having trouble accessing this event?'),
  ).toBeVisible();
  expect(
    screen.getByRole('link', { name: 'Contact tech support' }),
  ).toHaveAttribute('href', 'mailto:techsupport@asap.science');
});

it('renders calendar setup instructions', () => {
  render(<EventSupport />);

  expect(screen.getByRole('link', { name: 'Apple Calendar' })).toHaveAttribute(
    'href',
    'https://support.apple.com/en-us/guide/calendar/icl1022/mac',
  );
  expect(screen.getByRole('link', { name: 'Outlook' })).toHaveAttribute(
    'href',
    'https://support.microsoft.com/en-us/office/import-or-subscribe-to-a-calendar-in-outlook-com-cff1429c-5af6-41ec-a5b4-74f2c278e98c',
  );
});

it('copies the tech support email', async () => {
  Object.assign(navigator, {
    clipboard: {
      writeText: jest.fn(),
    },
  });

  render(<EventSupport />);

  await userEvent.click(screen.getByTitle(/copy/i));
  expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(
    expect.stringMatching(/techsupport@asap.science/i),
  );
});
