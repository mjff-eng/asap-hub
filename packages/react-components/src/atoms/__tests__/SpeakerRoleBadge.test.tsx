import { render, screen } from '@testing-library/react';

import { neutral500 } from '../../colors';
import SpeakerRoleBadge from '../SpeakerRoleBadge';

it('Should render the single role when exactly one role is given', () => {
  render(<SpeakerRoleBadge roles={['Lead PI']} />);
  expect(screen.getByText('Lead PI')).toBeVisible();
});

it('Should render "Multiple roles" when two or more roles are given', () => {
  render(<SpeakerRoleBadge roles={['Project Manager', 'Data Manager']} />);
  expect(screen.getByText('Multiple roles')).toBeVisible();
});

it('Should render "No role" when no roles are given', () => {
  render(<SpeakerRoleBadge roles={[]} />);
  expect(screen.getByText('No role')).toBeVisible();
});

it('Should apply neutral500 background when disabled', () => {
  render(<SpeakerRoleBadge roles={['Lead PI']} enabled={false} />);
  const textEl = screen.getByText('Lead PI');
  const pillSpan = textEl.parentElement?.parentElement;
  expect(pillSpan).toHaveStyle({ backgroundColor: neutral500.rgb });
});
