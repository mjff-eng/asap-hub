import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { neutral900, neutral300 } from '../../colors';
import { indicatorPadding } from '../../form';
import { perRem } from '../../pixels';
import TextField from '../TextField';

beforeEach(() => {
  jest.clearAllMocks();
});
it('renders an input field, passing through props', () => {
  render(<TextField value="val" />);
  expect(screen.getByRole('textbox')).toHaveValue('val');
});

it('emits value changes', async () => {
  const handleChange = jest.fn();
  render(<TextField value="val" onChange={handleChange} />);

  await userEvent.type(screen.getByRole('textbox'), 'u');
  expect(handleChange).toHaveBeenLastCalledWith('valu');
});

it('renders a disabled input field', () => {
  const { rerender } = render(<TextField value="" />);
  expect(
    (screen.getByRole('textbox') as HTMLInputElement).disabled,
  ).toBeFalsy();
  expect(
    getComputedStyle(screen.getByRole('textbox')).backgroundColor,
  ).not.toBe(neutral300.rgb);

  rerender(<TextField value="" enabled={false} />);
  expect((screen.getByRole('textbox') as HTMLInputElement).disabled).toBe(true);
  expect(getComputedStyle(screen.getByRole('textbox')).backgroundColor).toBe(
    neutral300.rgb,
  );
});

it('mutes the value colour of a disabled date field to match other disabled fields', () => {
  const { container } = render(
    <TextField type="date" value="2022-03-24" enabled={false} />,
  );
  const dateInput = container.querySelector(
    'input[type="date"]',
  ) as HTMLInputElement;
  expect(dateInput.disabled).toBe(true);
  expect(getComputedStyle(dateInput).color).toBe(neutral900.rgb);
});

it('with the label indicator prop prop shows a react node', () => {
  render(<TextField value="" labelIndicator={'github.com/'} />);
  expect(screen.getByText(/github/)).toBeVisible();
});

describe('with a right indicator', () => {
  it('shows the indicator', () => {
    render(
      <TextField
        value=""
        rightIndicator={<svg role="img" viewBox="0 0 2 1" />}
      />,
    );
    const { width, height } = getComputedStyle(
      screen.getByRole('img').parentElement!,
    );
    expect(
      Number(width.replace(/em$/, '')) / Number(height.replace(/em$/, '')),
    ).toBeCloseTo(2);
  });

  it('pads the field to make space for the indicator', () => {
    const { rerender } = render(<TextField value="" />);
    const normalPaddingRight = Number(
      getComputedStyle(screen.getByRole('textbox')).paddingRight.replace(
        /em$/,
        '',
      ),
    );

    rerender(
      <TextField
        value=""
        rightIndicator={<svg role="img" viewBox="0 0 2 1" />}
      />,
    );
    const customIndicatorPaddingRight = Number(
      getComputedStyle(screen.getByRole('textbox')).paddingRight.replace(
        /em$/,
        '',
      ),
    );
    const indicatorWidth = Number(
      getComputedStyle(screen.getByRole('img').parentElement!).width.replace(
        /em$/,
        '',
      ),
    );

    expect(customIndicatorPaddingRight).toBeCloseTo(
      normalPaddingRight + indicatorWidth + indicatorPadding / perRem,
    );
  });
});

describe('with a left indicator', () => {
  it('shows the indicator', () => {
    render(
      <TextField
        value=""
        leftIndicator={<svg role="img" viewBox="0 0 2 1" />}
      />,
    );
    const { width, height } = getComputedStyle(
      screen.getByRole('img').parentElement!,
    );
    expect(
      Number(width.replace(/em$/, '')) / Number(height.replace(/em$/, '')),
    ).toBeCloseTo(2);
  });

  it('pads the field to make space for the indicator', () => {
    const { rerender } = render(<TextField value="" />);
    const normalPaddingLeft = Number(
      getComputedStyle(screen.getByRole('textbox')).paddingLeft.replace(
        /em$/,
        '',
      ),
    );

    rerender(
      <TextField
        value=""
        leftIndicator={<svg role="img" viewBox="0 0 2 1" />}
      />,
    );
    const customIndicatorPaddingLeft = Number(
      getComputedStyle(screen.getByRole('textbox')).paddingLeft.replace(
        /em$/,
        '',
      ),
    );
    const indicatorWidth = Number(
      getComputedStyle(screen.getByRole('img').parentElement!).width.replace(
        /em$/,
        '',
      ),
    );

    expect(customIndicatorPaddingLeft).toBeCloseTo(
      normalPaddingLeft + indicatorWidth + indicatorPadding / perRem,
    );
  });
});
