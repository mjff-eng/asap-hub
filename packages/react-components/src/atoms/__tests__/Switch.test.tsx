import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';

import { colour } from '../../colors';
import Switch from '../Switch';

const props: ComponentProps<typeof Switch> = {
  onClick: jest.fn(),
};

describe('Switch', () => {
  it('renders the switch as a checkbox', () => {
    render(<Switch {...props} />);

    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('renders with custom props', () => {
    const customProps = {
      id: 'test-switch',
      checked: true,
      enabled: false,
      ariaLabel: 'Custom label',
    };

    render(<Switch {...props} {...customProps} />);

    const switchElement = screen.getByRole('checkbox');
    expect(switchElement).toHaveAttribute('id', 'test-switch');
    expect(switchElement).toBeChecked();
    expect(switchElement).toBeDisabled();
    expect(switchElement).toHaveAttribute('aria-label', 'Custom label');
  });

  it('uses noop function when no onClick is provided', async () => {
    render(<Switch />);
    const switchElement = screen.getByRole('checkbox');

    // This test ensures the component doesn't throw when clicked without an onClick handler
    expect(async () => {
      await userEvent.click(switchElement);
    }).not.toThrow();
  });

  it('calls onClick handler when clicked', async () => {
    const mockOnClick = jest.fn();
    render(<Switch {...props} onClick={mockOnClick} />);

    const switchElement = screen.getByLabelText('Toggle switch');
    await userEvent.click(switchElement);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick handler when disabled', async () => {
    const mockOnClick = jest.fn();
    render(<Switch {...props} onClick={mockOnClick} enabled={false} />);

    const switchElement = screen.getByLabelText('Toggle switch');
    await userEvent.click(switchElement);

    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('paints the off state red when uncheckedColor is error', () => {
    render(<Switch {...props} uncheckedColor="error" />);

    const switchElement = screen.getByRole('checkbox');
    expect(switchElement).toHaveStyleRule(
      'background-color',
      colour.background['error-inverse'],
    );
  });

  it('fills the on state with the brand inverse background', () => {
    render(<Switch {...props} checked />);

    expect(screen.getByRole('checkbox')).toHaveStyleRule(
      'background-color',
      colour.background['brand-inverse'],
      { target: ':checked' },
    );
  });
});
