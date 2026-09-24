import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ThemeProvider } from '@emotion/react';

import Link from '../Link';
import { color as colorConstructor, colour, colorFromHex } from '../../colors';

it('renders the text in an anchor', () => {
  const { getByText } = render(<Link href="/">text</Link>);
  expect(getByText('text').tagName).toBe('A');
});

describe('the default theme', () => {
  it('applies the default link color', () => {
    const { getByRole } = render(<Link href="/">text</Link>);
    expect(getByRole('link')).toHaveStyleRule('color', colour.foreground.brand);
  });

  it('applies an invisible underline', () => {
    const { getByRole } = render(<Link href="/">text</Link>);
    const { textDecoration } = getComputedStyle(getByRole('link'));
    expect(textDecoration).toBe('underline solid transparent');
  });
});

it('applies an underline when requested', () => {
  const { getByRole } = render(
    <Link underlined={true} href="/">
      text
    </Link>,
  );
  const { textDecoration } = getComputedStyle(getByRole('link'));
  expect(textDecoration).toBe('underline');
});

describe('theme with ThemeProvider', () => {
  it('uses the primary500 hex override that email layouts rely on', () => {
    const testColor = colorConstructor(12, 141, 195);
    const theme = {
      colors: {
        primary500: testColor,
      },
    };
    const { getByRole } = render(
      <ThemeProvider theme={theme}>
        <Link href="/">text</Link>
      </ThemeProvider>,
    );
    const { color } = getComputedStyle(getByRole('link'));
    expect(color).toBe(testColor.rgb);
  });
});
describe('the dark theme', () => {
  it('applies the white color', () => {
    const { getByRole } = render(
      <Link href="/" themeVariant="dark">
        text
      </Link>,
    );
    const { color } = getComputedStyle(getByRole('link'));
    expect(color).toBe(colorFromHex(colour.neutral[0]).rgb);
  });

  it('applies an invisible underline', () => {
    const { getByRole } = render(
      <Link href="/" themeVariant="dark">
        text
      </Link>,
    );
    const { textDecoration } = getComputedStyle(getByRole('link'));
    expect(textDecoration).toBe('underline solid transparent');
  });
});

describe('when button-styled', () => {
  it('adds button styles', () => {
    const { getByRole, rerender } = render(<Link href="/">text</Link>);
    expect(getComputedStyle(getByRole('link')).paddingLeft).toBe('');

    rerender(
      <Link href="/" buttonStyle>
        text
      </Link>,
    );
    expect(
      Number(
        getComputedStyle(getByRole('link')).paddingLeft.replace(/em$/, ''),
      ),
    ).toBeGreaterThan(0);
  });

  it('renders button with correct margins', () => {
    const { getByRole, rerender } = render(
      <Link href="/" buttonStyle>
        text
      </Link>,
    );

    const buttonWithMargin = Number(
      getComputedStyle(getByRole('link')).marginTop.replace(/em$/, ''),
    );

    expect(buttonWithMargin).toBe(1.0588235294117647);

    rerender(
      <Link href="/" buttonStyle noMargin>
        text
      </Link>,
    );

    const buttonWithoutMargin = Number(
      getComputedStyle(getByRole('link')).margin.replace(/em$/, ''),
    );

    expect(buttonWithoutMargin).toBe(0);
  });

  it('renders button with default margin', () => {
    const { getByRole } = render(
      <Link href="/" buttonStyle>
        text
      </Link>,
    );

    const buttonWithoutMargin = Number(
      getComputedStyle(getByRole('link')).margin.replace(/em$/, ''),
    );

    expect(buttonWithoutMargin).toBe(0);
  });

  it('renders button streched by default', () => {
    const { getByRole } = render(
      <Link href="/" buttonStyle>
        text
      </Link>,
    );

    expect(getComputedStyle(getByRole('link')).flexGrow).toBe('1');
  });

  it('supports primary button styles', () => {
    const { getByRole, rerender } = render(
      <Link href="/" buttonStyle>
        text
      </Link>,
    );
    expect(getByRole('link')).not.toHaveStyleRule(
      'background-color',
      colour.background.button.primary.default,
    );

    rerender(
      <Link href="/" buttonStyle primary>
        text
      </Link>,
    );
    expect(getByRole('link')).toHaveStyleRule(
      'background-color',
      colour.background.button.primary.default,
    );
  });

  it('supports small button styles', () => {
    const { getByRole, rerender } = render(
      <Link href="/" buttonStyle>
        text
      </Link>,
    );
    const normalPaddingTop = Number(
      getComputedStyle(getByRole('link')).paddingTop.replace(/em$/, ''),
    );

    rerender(
      <Link href="/" buttonStyle small>
        text
      </Link>,
    );
    const smallPaddingTop = Number(
      getComputedStyle(getByRole('link')).paddingTop.replace(/em$/, ''),
    );

    expect(smallPaddingTop).toBeLessThan(normalPaddingTop);
  });

  it('supports disabled button styles', () => {
    const { getByText, rerender } = render(
      <Link href="/" buttonStyle>
        text
      </Link>,
    );
    expect(getByText('text').closest('a')).not.toHaveStyleRule(
      'background-color',
      colour.background.disabled,
    );

    rerender(
      <Link href="/" buttonStyle enabled={false}>
        text
      </Link>,
    );
    expect(getByText('text').closest('a')).toHaveStyleRule(
      'background-color',
      colour.background.disabled,
    );
  });

  it('removes the href when disabled', () => {
    const { getByText, rerender } = render(
      <Link href="/" buttonStyle>
        text
      </Link>,
    );
    expect(getByText('text').closest('a')).toHaveAttribute('href');
    rerender(
      <Link href="/" buttonStyle enabled={false}>
        text
      </Link>,
    );
    expect(getByText('text').closest('a')).not.toHaveAttribute('href');
  });
});

describe('for elipsed links', () => {
  describe('when child is a string', () => {
    it('shows the title with the full text', () => {
      const longText =
        'A very long text showing that the elipsis feature is working well, trying to provide as much text here as I can to validate this feature.';
      const { getByTitle } = render(
        <div css={{ maxWidth: '10px' }}>
          <Link href="/" ellipsed>
            {longText}
          </Link>
        </div>,
      );

      expect(getByTitle(longText)).toBeInTheDocument();
    });
  });

  describe('when child is not a string', () => {
    it('does not show the title for buttonStyles', () => {
      const longText =
        'A very long text showing that the elipsis feature is working well, trying to provide as much text here as I can to validate this feature.';
      const { queryByTitle } = render(
        <div css={{ maxWidth: '10px' }}>
          <Link href="/" ellipsed buttonStyle>
            {longText}
          </Link>
        </div>,
      );

      expect(queryByTitle(longText)).not.toBeInTheDocument();
    });

    it('does not show the title for divs or any inner components', () => {
      const longText =
        'A very long text showing that the elipsis feature is working well, trying to provide as much text here as I can to validate this feature.';
      const { getByText } = render(
        <div css={{ maxWidth: '10px' }}>
          <Link href="/" ellipsed>
            <div data-testid="inner-div">{longText}</div>
          </Link>
        </div>,
      );

      expect(getByText(longText).closest('a')).not.toHaveAttribute('title');
    });
  });
});

it('forwards the click handler to the anchor', () => {
  const handleClick = jest.fn((event) => event.preventDefault());
  const { getByText } = render(
    <Link href="/" onClick={handleClick}>
      text
    </Link>,
  );

  getByText('text').click();
  expect(handleClick).toHaveBeenCalled();
});

it('passes openInNewTab through to the anchor', () => {
  const { getByRole } = render(
    <Link href="/teams/42" openInNewTab>
      text
    </Link>,
    { wrapper: MemoryRouter },
  );

  expect(getByRole('link')).toHaveAttribute('target', '_blank');
});
