import { findParentWithStyle } from '@asap-hub/dom-test-utils';
import { render } from '@testing-library/react';

import Pill from '../Pill';

it('renders a tag label with content', () => {
  const { container } = render(<Pill>Text</Pill>);
  expect(container.textContent).toEqual('Text');
});

it.each`
  accent       | border                  | background              | text
  ${'default'} | ${'rgb(227, 230, 232)'} | ${'transparent'}        | ${'rgb(86, 96, 102)'}
  ${'green'}   | ${'rgb(40, 121, 83)'}   | ${'rgb(226, 238, 237)'} | ${'rgb(40, 121, 83)'}
  ${'warning'} | ${'rgb(220, 104, 3)'}   | ${'rgb(252, 248, 238)'} | ${'rgb(220, 104, 3)'}
  ${'info'}    | ${'rgb(12, 141, 195)'}  | ${'rgb(230, 243, 249)'} | ${'rgb(12, 141, 195)'}
  ${'neutral'} | ${'rgb(136, 147, 154)'} | ${'rgb(250, 250, 250)'} | ${'rgb(136, 147, 154)'}
  ${'gray'}    | ${'transparent'}        | ${'rgb(250, 250, 250)'} | ${'rgb(86, 96, 102)'}
`(
  'sets text color border and background color for $accent',
  ({ accent, border, text, background }) => {
    const { getByText } = render(<Pill accent={accent}>Text</Pill>);

    expect([
      findParentWithStyle(getByText('Text')!, 'borderColor')!.borderColor,
      findParentWithStyle(getByText('Text')!, 'backgroundColor')!
        .backgroundColor,
      findParentWithStyle(getByText('Text')!, 'color')!.color,
    ]).toEqual([border, background, text]);
  },
);
