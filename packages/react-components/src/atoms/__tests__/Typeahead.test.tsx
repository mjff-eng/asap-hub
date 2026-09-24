import { findParentWithStyle } from '@asap-hub/dom-test-utils';
import { waitFor } from '@testing-library/dom';
import { fireEvent, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { colour, neutral900, colorFromHex } from '../../colors';
import Typeahead from '../Typeahead';

it('shows the selected value', () => {
  const { getByDisplayValue } = render(
    <Typeahead suggestions={['LHR']} value="LHR" />,
  );
  expect(getByDisplayValue('LHR')).toBeVisible();
});

it('when empty shows a placeholder message', () => {
  const { container } = render(<Typeahead suggestions={['LHR']} value="" />);
  expect(container).toHaveTextContent(/start typing/i);
});

it('opens a menu to select from on click', async () => {
  const handleChange = jest.fn();
  const { getByText, getByDisplayValue } = render(
    <Typeahead suggestions={['LHR', 'LGW']} value="" onChange={handleChange} />,
  );

  await userEvent.click(getByDisplayValue(''));
  await userEvent.click(getByText('LGW'));
  expect(handleChange).toHaveBeenLastCalledWith('LGW');
});

it('opens a filtered menu to select from when typing', async () => {
  const handleChange = jest.fn();
  const { getByText, queryByText, getByDisplayValue } = render(
    <Typeahead
      suggestions={['LHR', 'LGW', 'LTN']}
      value=""
      onChange={handleChange}
    />,
  );

  await userEvent.type(getByDisplayValue(''), 'LT');
  expect(queryByText('LGW')).not.toBeInTheDocument();

  await userEvent.click(getByText('LTN'));
  expect(handleChange).toHaveBeenLastCalledWith('LTN');
});

it('allows non-suggested input', async () => {
  const handleChange = jest.fn();
  const { getByDisplayValue } = render(
    <Typeahead suggestions={['LHR', 'LGW']} value="" onChange={handleChange} />,
  );
  await userEvent.type(getByDisplayValue(''), 'LTN');
  expect(handleChange).toHaveBeenLastCalledWith('LTN');
});

it('shows the focused suggestion in green', async () => {
  const { getByText, getByDisplayValue } = render(
    <Typeahead suggestions={['LHR', 'LGW']} value="" />,
  );
  await userEvent.click(getByDisplayValue(''));
  expect(
    findParentWithStyle(getByText('LGW'), 'color')?.color.replace(/ /g, ''),
  ).not.toBe(colorFromHex(colour.brand.crn[800]).rgb.replace(/ /g, ''));

  fireEvent.mouseOver(getByText('LGW'));
  expect(
    findParentWithStyle(getByText('LGW'), 'color')?.color.replace(/ /g, ''),
  ).toBe(colorFromHex(colour.brand.crn[800]).rgb.replace(/ /g, ''));
});

it('gets greyed out when disabled', () => {
  const { container, rerender } = render(
    <Typeahead suggestions={['LHR', 'LGW']} value="LHR" enabled={false} />,
  );
  // In react-select v5, the control element has the color/background styles
  const disabledControl = container.querySelector('[aria-disabled="true"]');
  expect(disabledControl).not.toBeNull();
  expect(getComputedStyle(disabledControl!).color).toBe(neutral900.rgb);
  expect(disabledControl).toHaveStyleRule(
    'background-color',
    colour.background.tertiary,
  );
  const disabledInput = container.querySelector('input');
  expect(disabledInput).toBeDisabled();

  rerender(<Typeahead suggestions={['LHR', 'LGW']} value="LHR" />);
  // After rerender, there's no aria-disabled, so we find control by class pattern
  const enabledControl = container.querySelector(
    '[class*="-container"] > div:not([aria-disabled])',
  );
  expect(enabledControl).not.toBeNull();
  expect(getComputedStyle(enabledControl!).color).not.toBe(neutral900.rgb);
  expect(enabledControl).not.toHaveStyleRule(
    'background-color',
    colour.background.tertiary,
  );
  const enabledInput = container.querySelector('input');
  expect(enabledInput).not.toBeDisabled();
});

describe('invalidity', () => {
  it('makes the value red', () => {
    const { container, rerender } = render(
      <Typeahead suggestions={['LHR', 'LGW']} value="LHR" />,
    );
    // In react-select v5, use findParentWithStyle from the input to check invalid state via borderColor
    const inputBefore = container.querySelector('input')!;
    expect(
      findParentWithStyle(inputBefore, 'borderStyle')?.element,
    ).not.toHaveStyleRule('border-color', colour.border.error);

    rerender(
      <Typeahead
        suggestions={['LHR', 'LGW']}
        value="LHR"
        customValidationMessage="Nope."
      />,
    );
    // After rerender with validation message, control should have error500 color
    const inputAfter = container.querySelector('input')!;
    expect(
      findParentWithStyle(inputAfter, 'borderStyle')?.element,
    ).toHaveStyleRule('border-color', colour.border.error);
  });

  it('is caused by being empty when required', async () => {
    const { getByDisplayValue, container } = render(
      <Typeahead suggestions={['LHR', 'LGW']} value="LHR" required />,
    );
    await userEvent.clear(getByDisplayValue('LHR'));
    await userEvent.tab();
    await waitFor(() => {
      // In react-select v5, use findParentWithStyle from the input to check invalid state via borderColor
      const inputElement = container.querySelector('input')!;
      expect(
        findParentWithStyle(inputElement, 'borderStyle')?.element,
      ).toHaveStyleRule('border-color', colour.border.error);
    });
  });
});

describe('async', () => {
  it('displays value', async () => {
    const loadOptions = jest.fn().mockResolvedValue(['example']);
    const { getByDisplayValue } = render(
      <Typeahead loadOptions={loadOptions} value="example" required />,
    );
    await waitFor(() => {
      expect(getByDisplayValue('example')).toBeVisible();
    });
  });
  it('displays and able to select suggestions', async () => {
    const loadOptions = jest.fn().mockResolvedValue(['test']);
    const onChange = jest.fn();
    const { getByDisplayValue, getByText } = render(
      <Typeahead
        loadOptions={loadOptions}
        value=""
        required
        onChange={onChange}
      />,
    );
    const input = getByDisplayValue('');
    await userEvent.type(input, 't');

    await waitFor(() => {
      const menuItem = getByText('test');
      expect(menuItem).toBeVisible();
      fireEvent.click(menuItem);
    });
    expect(onChange).toHaveBeenCalledWith('test');
  });

  it('allows unknown options to be entered', async () => {
    const loadOptions = jest.fn().mockResolvedValue([]);
    const onChange = jest.fn();
    const { getByDisplayValue } = render(
      <Typeahead
        loadOptions={loadOptions}
        value=""
        required
        onChange={onChange}
      />,
    );
    const input = getByDisplayValue('');
    await userEvent.type(input, 'example');

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('example'));
  });
});
