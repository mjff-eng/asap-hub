import React, { ReactNode } from 'react';
import { css, SerializedStyles, Theme } from '@emotion/react';

import { getButtonChildren, getButtonStyles } from '../button';
import { colour } from '../colors';
import { defaultThemeVariant, ThemeVariant } from '../theme';
import Ellipsis from './Ellipsis';
import Anchor from './Anchor';

export const styles = css({
  textDecoration: 'underline solid transparent',
  transition: 'text-decoration 100ms ease-in-out, color 100ms ease-in-out',

  ':hover': {
    textDecoration: 'underline',
  },
  ':active': {
    textDecoration: 'none',
  },
});

export const themeStyles: Record<ThemeVariant, SerializedStyles> = {
  light: css({
    color: colour.foreground.brand,
  }),
  grey: css({
    color: colour.foreground.brand,
  }),
  dark: css({
    color: colour.foreground['primary-inverse'],
    ':active': { color: colour.foreground['primary-inverse'] },
  }),
};

export const getLinkColors = (
  colors: Theme['colors'],
  themeVariant: ThemeVariant,
): SerializedStyles =>
  colors?.primary500
    ? css({ color: colors.primary500 })
    : themeStyles[themeVariant];

const iconThemeStyles: Record<ThemeVariant, SerializedStyles> = {
  light: css({
    svg: { stroke: colour.foreground.brand },
  }),
  grey: css({
    svg: { stroke: colour.foreground.brand },
  }),
  dark: css({
    svg: { stroke: colour.foreground['primary-inverse'] },
    ':active': { svg: { stroke: colour.foreground['primary-inverse'] } },
  }),
};

interface NormalLinkProps {
  readonly themeVariant?: ThemeVariant;
  readonly buttonStyle?: undefined;
  readonly primary?: undefined;
  readonly small?: undefined;
  readonly enabled?: undefined;
  readonly noMargin?: undefined;
  readonly fullWidth?: undefined;
}

interface ButtonStyleLinkProps {
  readonly themeVariant?: undefined;
  readonly buttonStyle: true;
  readonly primary?: boolean;
  readonly small?: boolean;
  readonly enabled?: boolean;
  readonly noMargin?: boolean;
  readonly fullWidth?: boolean;
}

type LinkProps = {
  readonly children: ReactNode;
  readonly href: string | undefined;
  readonly label?: string;
  readonly applyIconTheme?: boolean;
  readonly ellipsed?: boolean;
  readonly underlined?: boolean;
  readonly onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  readonly openInNewTab?: boolean;
} & (NormalLinkProps | ButtonStyleLinkProps);

const Link: React.FC<LinkProps> = ({
  children,
  href,
  label,
  onClick,
  themeVariant = defaultThemeVariant,
  buttonStyle = false,
  primary = false,
  small = false,
  enabled = true,
  applyIconTheme = false,
  noMargin,
  fullWidth = false,
  ellipsed = false,
  underlined = false,
  openInNewTab = false,
}) => {
  const linkStyles = ({ colors }: Theme) =>
    buttonStyle
      ? [
          getButtonStyles({
            primary,
            small,
            enabled,
            children,
            noMargin,
            fullWidth,
          }),
        ]
      : [
          styles,
          getLinkColors(colors, themeVariant),
          applyIconTheme && iconThemeStyles[themeVariant],
          underlined && { textDecoration: 'underline' },
        ];
  const linkChildren = buttonStyle ? getButtonChildren(children) : children;
  const applyEllipsis = ellipsed && typeof linkChildren === 'string';
  return (
    <Anchor
      href={href}
      enabled={enabled}
      openInNewTab={openInNewTab}
      aria-label={label}
      onClick={onClick}
      css={(theme) => linkStyles(theme)}
      title={applyEllipsis ? linkChildren : undefined}
    >
      {applyEllipsis ? <Ellipsis>{linkChildren}</Ellipsis> : linkChildren}
    </Anchor>
  );
};

export default Link;
