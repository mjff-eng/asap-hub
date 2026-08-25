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

  expect(backgroundColor).toMatchInlineSnapshot(`"rgb(248, 237, 222)"`);
  expect(color).toMatchInlineSnapshot(`"rgb(206, 128, 26)"`);
});

it('applies green variant colors (success100/crn green)', () => {
  const { container } = render(<StateTag label="Text" accent="green" />);

  expect(container.firstElementChild).toBeDefined();
  const { backgroundColor, color } = getComputedStyle(
    container.firstElementChild as Element,
  );

  expect(backgroundColor).toMatchInlineSnapshot(`"rgb(228, 245, 238)"`);
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
