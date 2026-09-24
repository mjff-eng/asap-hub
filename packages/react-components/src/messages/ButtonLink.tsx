import { ReactNode } from 'react';
import { css, Theme } from '@emotion/react';

import { Anchor } from '../atoms';
import { colour } from '../colors';
import { rem } from '../pixels';

const borderWidth = 1;

const styles = ({
  colors: { primary500 = colour.brand.crn[600] } = {},
}: Theme) =>
  css({
    display: 'inline-block',
    boxSizing: 'border-box',
    marginTop: rem(18),
    marginBottom: rem(18),
    paddingTop: rem(15 - borderWidth),
    paddingBottom: rem(15 - borderWidth),
    paddingLeft: rem(42 - borderWidth),
    paddingRight: rem(42 - borderWidth),
    borderStyle: 'solid',
    borderWidth: rem(borderWidth),
    borderRadius: rem(4),
    fontWeight: 'bold',
    textAlign: 'center',
    textDecoration: 'none',
    color: colour.neutral[0],
    backgroundColor: primary500,
    borderColor: primary500,
  });

interface ButtonLinkProps {
  readonly href: string;
  readonly children: ReactNode;
}

const ButtonLink: React.FC<ButtonLinkProps> = ({ href, children }) => (
  <Anchor href={href} css={styles}>
    {children}
  </Anchor>
);

export default ButtonLink;
