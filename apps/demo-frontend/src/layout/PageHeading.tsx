/** @jsxImportSource @emotion/react */
import { FC, ReactNode } from 'react';

import { headlineStyles } from '../ui/theme';

// every page opens on one h1: the size is a separate choice from the level, so
// a modest looking title still starts the outline where it belongs
export const PageHeading: FC<{
  readonly size?: 1 | 2 | 3;
  readonly children: ReactNode;
}> = ({ size = 2, children }) => <h1 css={headlineStyles[size]}>{children}</h1>;

export const SectionHeading: FC<{
  readonly children: ReactNode;
}> = ({ children }) => <h2 css={headlineStyles[3]}>{children}</h2>;
