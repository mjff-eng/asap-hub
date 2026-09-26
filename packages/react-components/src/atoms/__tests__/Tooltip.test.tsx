import { render } from '@testing-library/react';
import { rem } from '../../pixels';
import { colour } from '../../colors';

import Tooltip from '../Tooltip';

it('does not show the children by default', () => {
  const { getByText } = render(<Tooltip>text</Tooltip>);
  expect(getByText('text')).not.toBeVisible();
});

it('shows a tooltip with the children when shown', () => {
  const { getByRole, getByText } = render(<Tooltip shown>text</Tooltip>);
  expect(getByText('text')).toBeVisible();
  expect(getByRole('tooltip')).toHaveTextContent('text');
});

it('applies width as rem when width is a number', () => {
  const width = 34;
  const { getByRole } = render(
    <Tooltip shown width={width}>
      text
    </Tooltip>,
  );
  expect(getByRole('tooltip').parentElement).toHaveStyle({
    width: rem(width),
  });
});

it('recolours the bubble and its tail when a background is given', () => {
  const { getByRole } = render(
    <Tooltip shown background="rgb(0, 32, 44)">
      text
    </Tooltip>,
  );

  const bubble = getByRole('tooltip');
  expect(bubble).toHaveStyle({ backgroundColor: 'rgb(0, 32, 44)' });
  expect(bubble.parentElement).toHaveStyleRule(
    'border-top-color',
    'rgb(0, 32, 44)',
    { target: '::before' },
  );
});

it('keeps the default background when none is given', () => {
  const { getByRole } = render(<Tooltip shown>text</Tooltip>);
  expect(getByRole('tooltip')).toHaveStyleRule(
    'background-color',
    colour.brand.gp2[900],
  );
});
