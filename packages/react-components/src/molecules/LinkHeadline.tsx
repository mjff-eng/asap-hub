import { css, SerializedStyles, Theme } from '@emotion/react';
import { ComponentProps } from 'react';
import {
  Anchor,
  Display,
  Headline2,
  Headline3,
  Headline4,
  Headline5,
  Headline6,
} from '../atoms';
import { styles } from '../atoms/Link';
import { colour } from '../colors';
import { headlineStyles } from '../text';

export const hover = (colors: Theme['colors']): SerializedStyles =>
  css({
    ':hover': {
      color: colors?.primary500?.rgba || colour.brand.crn[500],
    },
  });

const headlineMap: Record<
  keyof typeof headlineStyles,
  | typeof Display
  | typeof Headline2
  | typeof Headline3
  | typeof Headline4
  | typeof Headline5
  | typeof Headline6
> = {
  1: Display,
  2: Headline2,
  3: Headline3,
  4: Headline4,
  5: Headline5,
  6: Headline6,
};

export type LinkHeadlineProps = (
  | ComponentProps<typeof Display>
  | ComponentProps<typeof Headline2>
  | ComponentProps<typeof Headline3>
  | ComponentProps<typeof Headline4>
  | ComponentProps<typeof Headline5>
  | ComponentProps<typeof Headline6>
) &
  ComponentProps<typeof Anchor> & {
    level: keyof typeof headlineMap;
    noMargin?: boolean;
  };

const LinkHeadline: React.FC<LinkHeadlineProps> = ({
  level,
  children,
  styleAsHeading,
  id,
  noMargin,
  ...anchorProps
}) => {
  const Heading = headlineMap[level];
  return (
    <Heading noMargin={noMargin} styleAsHeading={styleAsHeading} id={id}>
      <Anchor {...anchorProps} css={({ colors }) => [styles, hover(colors)]}>
        {children}
      </Anchor>
    </Heading>
  );
};

export default LinkHeadline;
