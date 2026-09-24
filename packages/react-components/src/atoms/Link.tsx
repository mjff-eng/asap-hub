import React, { ReactNode } from 'react';
import { css, SerializedStyles, Theme } from '@emotion/react';

import { getButtonChildren, getButtonStyles } from '../button';
import { colour, colorFromHex } from '../colors';
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
    color: colour.brand.crn[500],
  }),
  grey: css({
    color: colour.brand.crn[500],
    ':active': { color: colour.brand.crn[800] },
  }),
  dark: css({
    color: colour.neutral[0],
    ':active': { color: colour.neutral[0] },
  }),
};

export const getLinkColors = (
  colors: Theme['colors'],
  themeVariant: ThemeVariant,
): SerializedStyles =>
  colors?.primary500
    ? css({ color: colors.primary500.rgba })
    : themeStyles[themeVariant];

const iconThemeStyles: (
  colors: Theme['colors'],
) => Record<ThemeVariant, SerializedStyles> = ({
  primary500 = colorFromHex(colour.brand.crn[500]),
  primary900 = colorFromHex(colour.brand.crn[800]),
}: Theme['colors'] = {}) => ({
  light: css({
    svg: {
      stroke: primary500.rgba,
    },
    ':hover': {
      svg: {
        stroke: primary900.rgba,
      },
    },
    ':active': { svg: { stroke: primary500.rgba } },
  }),
  grey: css({
    svg: { stroke: primary500.rgba },
    ':active': { svg: { stroke: primary900.rgba } },
  }),
  dark: css({
    svg: { stroke: colour.neutral[0] },
    ':active': { svg: { stroke: colour.neutral[0] } },
  }),
});

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
            colors,
          }),
        ]
      : [
          styles,
          getLinkColors(colors, themeVariant),
          applyIconTheme && iconThemeStyles(colors)[themeVariant],
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
