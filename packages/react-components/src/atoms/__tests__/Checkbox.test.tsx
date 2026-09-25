import { ComponentProps } from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Checkbox from '../Checkbox';
import { colour } from '../../colors';

const props: ComponentProps<typeof Checkbox> = {
  groupName: '',
};

it('renders a checkbox', () => {
  const { getByRole } = render(<Checkbox {...props} />);
  expect(getByRole('checkbox')).toBeVisible();
});

it('renders a disabled checkbox', () => {
  const { getByRole } = render(<Checkbox {...props} enabled={false} />);
  expect(getByRole('checkbox')).toBeDisabled();
});

it('fires the select event', async () => {
  const handleChange = jest.fn();
  const { getByRole } = render(<Checkbox {...props} onSelect={handleChange} />);
  expect(handleChange.mock.calls.length).toBe(0);

  await userEvent.click(getByRole('checkbox'));
  expect(handleChange.mock.calls.length).toBe(1);
});

it('uses a grey hover border', () => {
  const { getByRole } = render(<Checkbox {...props} />);
  expect(getByRole('checkbox')).toHaveStyleRule(
    'border-color',
    colour.neutral[600],
    { target: ':enabled:hover' },
  );
});

it('fills the checked state with the brand inverse background and darkens it on hover', () => {
  const { getByRole } = render(<Checkbox {...props} checked />);
  expect(getByRole('checkbox')).toHaveStyleRule(
    'background-color',
    colour.background['brand-inverse'],
    { target: /:checked$/ },
  );
  expect(getByRole('checkbox')).toHaveStyleRule(
    'border-color',
    colour.background['brand-inverse'],
    { target: /:checked$/ },
  );
  expect(getByRole('checkbox')).toHaveStyleRule(
    'background-color',
    colour.background['hover-brand-inverse'],
    { target: /:checked:hover$/ },
  );
});
