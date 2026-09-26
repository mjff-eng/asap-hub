import { render, screen } from '@testing-library/react';

import { colour } from '../../colors';
import StateTag from '../StateTag';

it('renders a tag label with content', () => {
  const { container } = render(<StateTag label="Text" />);
  expect(container.textContent).toEqual('Text');
});

it('renders an icon if provided', () => {
  const testSvg = (
    <svg>
      <title>Icon</title>
    </svg>
  );
  render(<StateTag label="Text" icon={testSvg} />);
  expect(screen.getByTitle('Icon')).toBeInTheDocument();
});

it.each`
  variant      | accent       | background                   | text
  ${'default'} | ${undefined} | ${colour.background.warning} | ${colour.foreground.warning}
  ${'green'}   | ${'green'}   | ${colour.background.success} | ${colour.foreground.success}
  ${'blue'}    | ${'blue'}    | ${colour.background.info}    | ${colour.foreground.info}
`('applies the $variant variant colours', ({ accent, background, text }) => {
  const { container } = render(<StateTag label="Text" accent={accent} />);

  expect(container.firstElementChild).toHaveStyleRule(
    'background-color',
    background,
  );
  expect(container.firstElementChild).toHaveStyleRule('color', text);
});
