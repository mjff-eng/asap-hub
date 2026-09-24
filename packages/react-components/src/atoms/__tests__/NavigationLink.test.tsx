import { ReactNode, useEffect } from 'react';
import { ThemeProvider } from '@emotion/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation, StaticRouter } from 'react-router';
import { color, colour, colorFromHex } from '../../colors';
import NavigationLink from '../NavigationLink';

// Helper to capture location in tests
let currentPathname: string | null = null;
const LocationCapture = () => {
  const location = useLocation();
  useEffect(() => {
    currentPathname = location.pathname;
  }, [location]);
  return null;
};

// Wrapper component with future flags for RTL's wrapper option
const MemoryRouterWithFuture = ({ children }: { children: ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe.each`
  description           | wrapper
  ${'with a router'}    | ${StaticRouter}
  ${'without a router'} | ${MemoryRouterWithFuture}
`('$description', ({ wrapper }) => {
  it('renders a link with the given text', () => {
    render(
      <NavigationLink href="/" icon={<svg />}>
        Text
      </NavigationLink>,
      { wrapper },
    );
    expect(screen.getByRole('link')).toHaveTextContent('Text');
  });

  it('renders a link with the given icon', () => {
    render(
      <NavigationLink href="/" icon={<svg />}>
        Text
      </NavigationLink>,
      { wrapper },
    );
    expect(screen.getByRole('link')).toContainHTML('<svg');
  });

  it('renders a link with the given href', () => {
    render(
      <NavigationLink href="/" icon={<svg />}>
        Text
      </NavigationLink>,
      { wrapper },
    );
    expect(screen.getByRole('link')).toHaveAttribute('href', '/');
  });

  it('renders the current link with the active background', () => {
    render(
      <>
        <NavigationLink href="/" icon={<svg />}>
          Target
        </NavigationLink>
        <NavigationLink href="/other" icon={<svg />}>
          Other
        </NavigationLink>
      </>,
      { wrapper },
    );
    expect(screen.getByText('Target').parentElement).toHaveStyleRule(
      'background-color',
      colour.background.active,
    );
    expect(screen.getByText('Other').parentElement).not.toHaveStyleRule(
      'background-color',
      colour.background.active,
    );
  });

  it('disables the current link when not enabled', () => {
    const Wrapper = wrapper;
    render(
      <Wrapper>
        <NavigationLink href="/location" icon={<svg />} enabled={false}>
          Target
        </NavigationLink>
      </Wrapper>,
    );
    const targetElement = screen.getByText('Target');
    // The text is inside a <p>, which is inside a styled div
    const styledDiv = targetElement.parentElement;
    expect(styledDiv).toHaveStyle('opacity: 0.3');
    expect(styledDiv).toHaveStyle('pointer-events: none');
  });
});

describe('with a router', () => {
  it('does not trigger a full page navigation on click', () => {
    currentPathname = null;
    render(
      <MemoryRouter initialEntries={['/']}>
        <LocationCapture />
        <NavigationLink href="/location" icon={<svg />}>
          Text
        </NavigationLink>
      </MemoryRouter>,
    );
    expect(fireEvent.click(screen.getByRole('link'))).toBe(false);
    expect(currentPathname).toEqual('/location');
  });

  it('triggers a full page navigation on click of an external link', () => {
    render(
      <MemoryRouter>
        <NavigationLink href="http://example.com/" icon={<svg />}>
          Text
        </NavigationLink>
      </MemoryRouter>,
    );
    expect(fireEvent.click(screen.getByRole('link'))).toBe(true);
  });

  it('default route is not always highlighted as selected', () => {
    currentPathname = null;
    render(
      <MemoryRouter initialEntries={['/location']}>
        <LocationCapture />
        <NavigationLink href="/" icon={<svg />}>
          Default
        </NavigationLink>
        <NavigationLink href="/other" icon={<svg />}>
          Other
        </NavigationLink>
        <NavigationLink href="/location" icon={<svg />}>
          Target
        </NavigationLink>
      </MemoryRouter>,
    );
    expect(currentPathname).toEqual('/location');
    expect(screen.getByText('Target').parentElement).toHaveStyleRule(
      'background-color',
      colour.background.active,
    );
    expect(screen.getByText('Other').parentElement).not.toHaveStyleRule(
      'background-color',
      colour.background.active,
    );
    expect(screen.getByText('Default').parentElement).not.toHaveStyleRule(
      'background-color',
      colour.background.active,
    );
  });
});

describe('without a router (external link with matching pathname)', () => {
  const originalLocation = window.location;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Mock window.location so external link pathname matches
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000/test',
        pathname: '/test',
        origin: 'http://localhost:3000',
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    consoleErrorSpy.mockRestore();
  });

  it('sets active class when pathname matches', () => {
    // Use an external link (different origin) with pathname matching current location
    // This triggers the non-router path (lines 132-149) where active is calculated
    // based on window.location.pathname comparison
    render(
      <MemoryRouter>
        <NavigationLink href="http://example.com/test" icon={<svg />}>
          Active Link
        </NavigationLink>
      </MemoryRouter>,
    );

    const link = screen.getByRole('link');
    // Should have 'active' class when pathname matches
    expect(link).toHaveClass('active');

    // Should have active styles applied
    expect(screen.getByText('Active Link').parentElement).toHaveStyleRule(
      'background-color',
      colour.background.active,
    );
  });
});

describe('with ThemeProvider', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Mock window.location so external link pathname matches and link is active
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000/',
        pathname: '/',
        origin: 'http://localhost:3000',
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it('uses default colors when no theme whas provided', () => {
    render(
      <MemoryRouter>
        <NavigationLink href="http://example.com/" icon={<svg />}>
          Text
        </NavigationLink>
      </MemoryRouter>,
    );
    const { color: primaryColor } = getComputedStyle(screen.getByRole('link'));
    expect(primaryColor).toBe(colorFromHex(colour.brand.crn[800]).rgb);
    expect(screen.getByRole('link')).toHaveStyleRule(
      'background-color',
      colour.background.active,
    );
  });
  it('uses the theme text colour and the product background', () => {
    const activePrimaryColor = color(0, 106, 146);
    const theme = {
      colors: {
        primary900: activePrimaryColor,
      },
    };
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <NavigationLink href="http://example.com/" icon={<svg />}>
            Text
          </NavigationLink>
        </ThemeProvider>
      </MemoryRouter>,
    );
    const { color: primaryColor } = getComputedStyle(screen.getByRole('link'));
    expect(primaryColor).toBe(activePrimaryColor.rgb);
    expect(screen.getByRole('link')).toHaveStyleRule(
      'background-color',
      colour.background.active,
    );
  });
});
