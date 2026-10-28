import { render, screen } from '@testing-library/react';

import { colour } from '../../colors';
import InPersonPill from '../InPersonPill';

it('renders the In person label', () => {
  render(<InPersonPill />);
  expect(screen.getByText('In person')).toBeVisible();
});

it('uses the info colours', () => {
  render(<InPersonPill />);
  expect(screen.getByText('In person')).toHaveStyle({
    backgroundColor: colour.background.info,
    color: colour.foreground.info,
  });
});
