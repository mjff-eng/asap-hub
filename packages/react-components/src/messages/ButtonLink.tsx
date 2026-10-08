import { ReactNode } from 'react';
import { css, Theme } from '@emotion/react';

import { Anchor } from '../atoms';
import { formTargetWidth, mobileScreen, rem } from '../pixels';
import { themeColour } from '../theme';

const borderWidth = 1;

const styles = ({
  colors: {
    buttonBackground = themeColour(
      'crn',
      'colour/background/button/primary/default',
    ),
    buttonBorder = themeColour('crn', 'colour/border/button/primary/default'),
  } = {},
}: Theme) =>
  css({
    display: 'inline-block',
    boxSizing: 'border-box',
    maxWidth: rem(formTargetWidth),
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
    color: themeColour('crn', 'colour/foreground/button/primary/default'),
    backgroundColor: buttonBackground,
    borderColor: buttonBorder,
    [`@media (max-width: ${mobileScreen.max}px)`]: {
      minWidth: '100%',
    },
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
