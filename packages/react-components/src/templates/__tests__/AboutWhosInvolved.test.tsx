import { createUserResponse } from '@asap-hub/fixtures';
import { render, screen } from '@testing-library/react';

import AboutWhosInvolved from '../AboutWhosInvolved';

const props = {
  asapAreas: [],
  scientificAdvisoryBoard: [
    { ...createUserResponse({}, 0), id: 'sab-1', displayName: 'Ada Board' },
  ],
  cnsQuestMembers: [
    { ...createUserResponse({}, 1), id: 'cns-1', displayName: 'Cal Quest' },
  ],
};

it('renders the Scientific Advisory Board and CNS Quest members', () => {
  render(<AboutWhosInvolved {...props} />);

  expect(
    screen.getByRole('heading', { name: 'Meet the Scientific Advisory Board' }),
  ).toBeVisible();
  expect(screen.getByRole('link', { name: 'Ada Board' })).toBeVisible();
  expect(
    screen.getByRole('heading', { name: 'Meet the CNS Quest Team' }),
  ).toBeVisible();
  expect(screen.getByRole('link', { name: 'Cal Quest' })).toBeVisible();
});

it('renders the tech support link', () => {
  render(<AboutWhosInvolved {...props} />);

  expect(
    screen.getByRole('link', { name: 'Contact tech support' }),
  ).toHaveAttribute('href', expect.stringMatching(/^mailto:/));
});
