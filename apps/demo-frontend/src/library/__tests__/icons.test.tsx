import { render } from '@testing-library/react';
import { FC } from 'react';

import * as icons from '../icons';

const all = Object.entries(icons) as [string, FC<{ size?: number }>][];

it.each(all)('draws %s as a decorative icon', (_name, Icon) => {
  const { container } = render(<Icon />);

  const svg = container.querySelector('svg');
  expect(svg).toHaveAttribute('aria-hidden', 'true');
  expect(svg).toHaveAttribute('focusable', 'false');
});

it.each(all)('draws %s at the size it is given', (_name, Icon) => {
  const { container } = render(<Icon size={28} />);

  const svg = container.querySelector('svg');
  expect(svg).toHaveAttribute('width', '28');
  expect(svg).toHaveAttribute('height', '28');
});
