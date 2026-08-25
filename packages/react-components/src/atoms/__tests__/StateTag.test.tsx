import { render, screen } from '@testing-library/react';

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

it('applies default colors (apricot/clay)', () => {
  const { container } = render(<StateTag label="Text" />);

  expect(container.firstElementChild).toBeDefined();
  const { backgroundColor, color } = getComputedStyle(
    container.firstElementChild as Element,
  );

  expect(backgroundColor).toMatchInlineSnapshot(`"rgb(252, 248, 238)"`);
  expect(color).toMatchInlineSnapshot(`"rgb(220, 104, 3)"`);
});

it('applies green variant colors (success100/crn green)', () => {
  const { container } = render(<StateTag label="Text" accent="green" />);

  expect(container.firstElementChild).toBeDefined();
  const { backgroundColor, color } = getComputedStyle(
    container.firstElementChild as Element,
  );

  expect(backgroundColor).toMatchInlineSnapshot(`"rgb(226, 238, 237)"`);
  expect(color).toMatchInlineSnapshot(`"rgb(52, 162, 112)"`);
});

it('applies blue variant colors (info100/info900)', () => {
  const { container } = render(<StateTag label="Text" accent="blue" />);

  expect(container.firstElementChild).toBeDefined();
  const { backgroundColor, color } = getComputedStyle(
    container.firstElementChild as Element,
  );

  expect(backgroundColor).toMatchInlineSnapshot(`"rgb(230, 243, 249)"`);
  expect(color).toMatchInlineSnapshot(`"rgb(12, 141, 195)"`);
});
