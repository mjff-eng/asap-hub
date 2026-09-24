import { render } from '@testing-library/react';
import { findParentWithStyle } from '@asap-hub/dom-test-utils';

import Avatar from '../Avatar';
import { colour, colorFromHex } from '../../colors';

it('renders the profile picture', () => {
  const { getByRole } = render(<Avatar imageUrl="/avatar.png" />);
  const { backgroundImage } = getComputedStyle(getByRole('img'));
  expect(backgroundImage).toContain('/avatar.png');
});

it('generates a label text based on the name', () => {
  const { getByLabelText } = render(
    <Avatar imageUrl="/avatar.png" firstName="John" lastName="Doe" />,
  );
  expect(getByLabelText(/pic.+John Doe/i)).toBeVisible();
});

it('generates a label text when no name is available', () => {
  const { getByLabelText } = render(<Avatar imageUrl="/avatar.png" />);
  expect(getByLabelText(/pic/)).toBeVisible();
});

it('generates a label text for a placeholder', () => {
  const { getByLabelText } = render(<Avatar placeholder="+1" />);
  expect(getByLabelText(/placeholder.+\+1/)).toBeVisible();
});

it('shows a placeholder on white background', () => {
  const { getByText } = render(<Avatar placeholder="+1" />);

  expect(getByText('+1')).toBeVisible();

  const { backgroundColor } = findParentWithStyle(
    getByText('+1'),
    'backgroundColor',
  )!;
  expect(backgroundColor).toBe(colorFromHex(colour.neutral[0]).rgb);
});

it("shows the initials 'JD' on colored background", () => {
  const { getByText, getByRole } = render(
    <Avatar firstName="John" lastName="Doe" />,
  );

  expect(getByText('JD')).toBeVisible();

  expect(getByRole('img')).toHaveStyleRule(
    'background-color',
    expect.stringMatching(
      /^var\(--colour-background-color-(yellow|green|lavender|blue|brand)\)$/,
    ),
  );
});

it('does not show the initials if there is an image', () => {
  const { getByText } = render(
    <Avatar firstName="John" lastName="Doe" imageUrl="/avatar.png" />,
  );

  expect(getByText('JD')).not.toBeVisible();
});

it.each`
  firstName    | lastName     | initials
  ${'John'}    | ${undefined} | ${'J'}
  ${undefined} | ${'Doe'}     | ${'D'}
  ${undefined} | ${undefined} | ${''}
`(
  "shows the initials '$initials' when no image is available",
  ({ initials, ...nameProps }) => {
    const { container } = render(<Avatar {...nameProps} />);
    expect(container).toHaveTextContent(initials);
  },
);

it('respects the border prop', () => {
  const { getByRole, rerender } = render(<Avatar imageUrl="/avatar.png" />);
  expect(
    findParentWithStyle(getByRole('img'), 'borderStyle')?.borderStyle,
  ).toBeFalsy();

  rerender(<Avatar imageUrl="/avatar.png" border />);
  expect(
    findParentWithStyle(getByRole('img'), 'borderStyle')?.borderStyle,
  ).toMatchInlineSnapshot(`"solid"`);
});
