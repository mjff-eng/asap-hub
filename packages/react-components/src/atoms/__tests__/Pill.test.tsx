import { render } from '@testing-library/react';

import { colour } from '../../colors';
import Pill from '../Pill';

it('renders a tag label with content', () => {
  const { container } = render(<Pill>Text</Pill>);
  expect(container.textContent).toEqual('Text');
});

it.each`
  accent       | borderRule        | border                    | background                    | text
  ${'default'} | ${'border-color'} | ${colour.border.tertiary} | ${'transparent'}              | ${colour.foreground.tertiary}
  ${'green'}   | ${'border-color'} | ${colour.border.success}  | ${colour.background.success}  | ${colour.foreground.success}
  ${'warning'} | ${'border-color'} | ${colour.border.warning}  | ${colour.background.warning}  | ${colour.foreground.warning}
  ${'info'}    | ${'border-color'} | ${colour.border.info}     | ${colour.background.info}     | ${colour.foreground.info}
  ${'neutral'} | ${'border-color'} | ${colour.neutral[400]}    | ${colour.background.tertiary} | ${colour.foreground.quaternary}
  ${'gray'}    | ${'border'}       | ${'transparent'}          | ${colour.background.tertiary} | ${colour.foreground.tertiary}
`(
  'sets text color border and background color for $accent',
  ({ accent, borderRule, border, text, background }) => {
    const { container } = render(<Pill accent={accent}>Text</Pill>);
    const pill = container.firstElementChild;

    expect(pill).toHaveStyleRule(borderRule, border);
    expect(pill).toHaveStyleRule('background-color', background);
    expect(pill).toHaveStyleRule('color', text);
  },
);
