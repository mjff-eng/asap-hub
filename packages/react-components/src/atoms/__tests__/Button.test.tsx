import { fireEvent, render, screen } from '@testing-library/react';

import { colour } from '../../colors';
import { OrcidIcon } from '../../icons';

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
  it('renders a primary button with the primary button roles', () => {
    const { getByRole, rerender } = render(<Button />);
    expect(getByRole('button')).not.toHaveStyleRule(
      'background-color',
      colour.background.button.primary.default,
    );
    rerender(<Button primary />);
    expect(getByRole('button')).toHaveStyleRule(
      'background-color',
      colour.background.button.primary.default,
    );
    expect(getByRole('button')).toHaveStyleRule(
      'color',
      colour.foreground.button.primary.default,
    );
    expect(getByRole('button')).toHaveStyleRule(
      'border-color',
      colour.border.button.primary.default,
    );
  });

  it('uses the primary button hover roles', () => {
    const { getByRole } = render(<Button primary />);
    expect(getByRole('button')).toHaveStyleRule(
      'background-color',
      colour.background.button.primary.hover,
      { target: ':hover' },
    );
    expect(getByRole('button')).toHaveStyleRule(
      'border-color',
      colour.border.button.primary.hover,
      { target: ':hover' },
    );
  });
});

it('renders an active secondary button', () => {
  const { getByRole, rerender } = render(<Button />);
  expect(getByRole('button')).not.toHaveStyle({
    borderColor: colour.neutral[900],
  });

  rerender(<Button active />);
  expect(getByRole('button')).toHaveStyle({
    borderColor: colour.neutral[900],
  });
});

it('renders an active primary button', () => {
  const { getByRole, rerender } = render(<Button primary />);
  expect(getByRole('button')).not.toHaveStyleRule(
    'background-color',
    colour.background.active,
  );

  rerender(<Button primary active />);
  expect(getByRole('button')).toHaveStyleRule(
    'background-color',
    colour.background.active,
  );
  expect(getByRole('button')).toHaveStyleRule('color', colour.foreground.brand);
});

it('renders a warning button with inverse text', () => {
  const { getByRole } = render(<Button primary warning />);
  expect(getByRole('button')).toHaveStyleRule(
    'color',
    colour.foreground['primary-inverse'],
  );
});

it('renders a disabled button', () => {
  const { getByRole, rerender } = render(<Button />);
  expect((getByRole('button') as HTMLButtonElement).disabled).toBeFalsy();
  expect(getByRole('button')).not.toHaveStyleRule(
    'background-color',
    colour.background.disabled,
  );

  rerender(<Button enabled={false} />);
  expect((getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  expect(getByRole('button')).toHaveStyleRule(
    'background-color',
    colour.background.disabled,
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
  expect(getByRole('button')).toHaveStyleRule('color', colour.foreground.brand);
  const { padding } = getComputedStyle(getByRole('button'));
  expect(padding).toMatchInlineSnapshot(`"0px"`);
});

it('forwards the onClick event handler', () => {
  const clickHandler = jest.fn();
  const { getByRole } = render(<Button onClick={clickHandler} />);
  const button = getByRole('button');

  fireEvent.click(button);
  expect(clickHandler).toHaveBeenCalled();
});
