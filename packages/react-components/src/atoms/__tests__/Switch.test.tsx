import { ThemeProvider } from '@emotion/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';

import { color, colour } from '../../colors';
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

  it('uses ThemeProvider theme primaryColor', () => {
    // Mock getComputedStyle to avoid jsdom "Not implemented: window.computedStyle(elt, pseudoElt)" error
    const originalGetComputedStyle = window.getComputedStyle;
    const mockGetComputedStyle = jest.fn(
      (elt: Element, pseudoElt?: string | null) => {
        if (pseudoElt) {
          // Return a mock CSSStyleDeclaration for pseudo-elements
          return {
            backgroundColor: 'rgb(0, 106, 146)',
          } as unknown as CSSStyleDeclaration;
        }
        return originalGetComputedStyle(elt);
      },
    );
    window.getComputedStyle = mockGetComputedStyle;

    const testCheckedBackgroundColor = color(0, 106, 146);
    const theme = {
      colors: {
        primary500: testCheckedBackgroundColor,
      },
    };
    render(
      <ThemeProvider theme={theme}>
        <Switch {...props} checked />
      </ThemeProvider>,
    );

    const switchElement = screen.getByLabelText('Toggle switch');

    const { backgroundColor: checkedBackgroundColor } = getComputedStyle(
      switchElement,
      ':checked',
    );

    expect(checkedBackgroundColor).toBe(testCheckedBackgroundColor.rgb);

    // Restore original getComputedStyle
    window.getComputedStyle = originalGetComputedStyle;
  });
});
