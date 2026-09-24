import { render } from '@testing-library/react';

import * as colors from '../../colors';
import Pill from '../Pill';

const { colour } = colors;

it('renders a tag label with content', () => {
  const { container } = render(<Pill>Text</Pill>);
  expect(container.textContent).toEqual('Text');
});

it.each`
  accent       | borderRule        | border                    | background                    | text
  ${'default'} | ${'border-color'} | ${colour.border.tertiary} | ${'transparent'}              | ${colors.neutral900.rgb}
  ${'green'}   | ${'border-color'} | ${colour.brand.crn[800]}  | ${colors.success100.rgb}      | ${colour.brand.crn[800]}
  ${'warning'} | ${'border-color'} | ${colour.border.warning}  | ${colors.warning100.rgb}      | ${colour.foreground.warning}
  ${'info'}    | ${'border-color'} | ${colors.info500.rgb}     | ${colors.info100.rgb}         | ${colors.info500.rgb}
  ${'neutral'} | ${'border-color'} | ${colors.neutral800.rgb}  | ${colour.background.tertiary} | ${colors.neutral800.rgb}
  ${'gray'}    | ${'border'}       | ${'transparent'}          | ${colour.background.tertiary} | ${colors.neutral900.rgb}
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
