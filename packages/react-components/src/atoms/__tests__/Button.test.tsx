import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@emotion/react';

import { charcoal, color, colour, neutral300 } from '../../colors';
import { OrcidIcon } from '../../icons';
import { activePrimaryBackgroundColorDefault } from '../../button';

import Button from '../Button';

it('renders a button with an icon and text', () => {
  const { getByRole } = render(
    <Button>
      <OrcidIcon />
      Text
    </Button>,
  );
  expect(getByRole('button')).toContainHTML('<svg');
  expect(getByRole('button')).toHaveTextContent('Text');
});

it('renders a button with text only with increased horizontal padding', () => {
  const { getByRole, rerender } = render(
    <Button>
      <OrcidIcon />
      Text
    </Button>,
  );
  const normalPaddingLeft = Number(
    getComputedStyle(getByRole('button')).paddingLeft.replace(/em$/, ''),
  );

  rerender(<Button>Text</Button>);
  const textOnlyPaddingLeft = Number(
    getComputedStyle(getByRole('button')).paddingLeft.replace(/em$/, ''),
  );

  expect(textOnlyPaddingLeft).toBeGreaterThan(normalPaddingLeft);
});

it('renders a button with an icon only with decreased horizontal padding', () => {
  const { getByRole, rerender } = render(
    <Button>
      <OrcidIcon />
      Text
    </Button>,
  );
  const normalPaddingLeft = Number(
    getComputedStyle(getByRole('button')).paddingLeft.replace(/em$/, ''),
  );

  rerender(
    <Button>
      <OrcidIcon />
    </Button>,
  );
  const iconOnlyPaddingLeft = Number(
    getComputedStyle(getByRole('button')).paddingLeft.replace(/em$/, ''),
  );

  expect(iconOnlyPaddingLeft).toBeLessThan(normalPaddingLeft);
});

it('renders a button without margin', () => {
  const { getByRole, rerender } = render(
    <Button>
      <OrcidIcon />
      Text
    </Button>,
  );
  const normalPaddingLeft = Number(
    getComputedStyle(getByRole('button')).paddingLeft.replace(/em$/, ''),
  );

  rerender(
    <Button>
      <OrcidIcon />
    </Button>,
  );
  const iconOnlyPaddingLeft = Number(
    getComputedStyle(getByRole('button')).paddingLeft.replace(/em$/, ''),
  );

  expect(iconOnlyPaddingLeft).toBeLessThan(normalPaddingLeft);
});
describe('primary button', () => {
  it('renders a primary button', () => {
    const { getByRole, rerender } = render(<Button />);
    expect(getComputedStyle(getByRole('button')).backgroundColor).not.toBe(
      colour.brand.crn[500].rgb,
    );
    rerender(<Button primary />);
    expect(getComputedStyle(getByRole('button')).backgroundColor).toBe(
      colour.brand.crn[500].rgb,
    );
  });

  it('uses ThemeProvider theme primaryColor', () => {
    const testBorderColor = color(12, 141, 195);
    const testBackgroundColor = color(0, 106, 146);
    const theme = {
      colors: {
        primary500: testBackgroundColor,
        primary900: testBorderColor,
      },
    };
    const { getByRole } = render(
      <ThemeProvider theme={theme}>
        <Button primary />
      </ThemeProvider>,
    );
    const { backgroundColor, borderColor } = getComputedStyle(
      getByRole('button'),
    );
    expect(borderColor).toBe(testBorderColor.rgba);
    expect(backgroundColor).toBe(testBackgroundColor.rgb);
  });
});

it('renders an active secondary button', () => {
  const { getByRole, rerender } = render(<Button />);
  expect(getComputedStyle(getByRole('button')).borderColor).not.toBe(
    charcoal.rgb,
  );

  rerender(<Button active />);
  expect(getComputedStyle(getByRole('button')).borderColor).toBe(charcoal.rgb);
});

it('renders an active primary button', () => {
  const { getByRole, rerender } = render(<Button primary />);
  expect(getComputedStyle(getByRole('button')).backgroundColor).not.toBe(
    activePrimaryBackgroundColorDefault.rgba,
  );

  rerender(<Button primary active />);
  expect(getComputedStyle(getByRole('button')).backgroundColor).toBe(
    activePrimaryBackgroundColorDefault.rgba,
  );
});

it('renders a disabled button', () => {
  const { getByRole, rerender } = render(<Button />);
  expect((getByRole('button') as HTMLButtonElement).disabled).toBeFalsy();
  expect(getComputedStyle(getByRole('button')).backgroundColor).not.toBe(
    neutral300.rgb,
  );

  rerender(<Button enabled={false} />);
  expect((getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  expect(getComputedStyle(getByRole('button')).backgroundColor).toBe(
    neutral300.rgb,
  );
});

it('renders a small button', () => {
  const { getByRole, rerender } = render(<Button />);
  const normalPaddingTop = Number(
    getComputedStyle(getByRole('button')).paddingTop.replace(/em$/, ''),
  );

  rerender(<Button small />);
  const smallPaddingTop = Number(
    getComputedStyle(getByRole('button')).paddingTop.replace(/em$/, ''),
  );

  expect(smallPaddingTop).toBeLessThan(normalPaddingTop);
});

it('renders a stretched small button', () => {
  render(<Button small />);

  expect(getComputedStyle(screen.getByRole('button')).flexGrow).toBe('1');
});

describe('the type', () => {
  it('is button by default', () => {
    const { getByRole } = render(<Button />);
    expect(getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('is submit for a primary button', () => {
    const { getByRole } = render(<Button primary />);
    expect(getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('is submit if set explicitly', () => {
    const { getByRole } = render(<Button submit />);
    expect(getByRole('button')).toHaveAttribute('type', 'submit');
  });
});

it('renders a link-styled button', () => {
  const { getByRole } = render(<Button linkStyle />);
  const { color: buttonColor, padding } = getComputedStyle(getByRole('button'));
  expect(buttonColor).toBe(colour.brand.crn[500].rgb);
  expect(padding).toMatchInlineSnapshot(`"0px"`);
});

it('forwards the onClick event handler', () => {
  const clickHandler = jest.fn();
  const { getByRole } = render(<Button onClick={clickHandler} />);
  const button = getByRole('button');

  fireEvent.click(button);
  expect(clickHandler).toHaveBeenCalled();
});
