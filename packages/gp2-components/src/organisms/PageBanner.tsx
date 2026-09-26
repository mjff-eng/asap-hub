import {
  accents,
  drawerQuery,
  Paragraph,
  pixels,
} from '@asap-hub/react-components';
import { css } from '@emotion/react';
import { smallerScreenQuery } from '../layout';

const { mobileScreen, rem, tabletScreen, vminLinearCalcClamped } = pixels;

type PageBannerProp = {
  image?: string;
  position?: string;
  title: string;
  description?: string;
  noMarginBottom?: boolean;
  noLayoutPadding?: boolean;
  noBorderTop?: boolean;
  children?: React.ReactNode;
};

const headerMaxWidth = 748;

const headerStyles = css({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
});

const cardStyles = css({
  width: '100vw',
  borderWidth: 0,
  borderTopWidth: 1,
  borderBottomWidth: 1,
  borderStyle: 'solid',
});

const textContainerStyles = (noMarginBottom: boolean) =>
  css({
    maxWidth: rem(headerMaxWidth),
    margin: `${rem(48)} auto ${noMarginBottom ? 0 : rem(32)}`,
    [smallerScreenQuery]: {
      margin: `${rem(32)} ${vminLinearCalcClamped(
        mobileScreen,
        24,
        tabletScreen,
        72,
        'px',
      )} ${noMarginBottom ? 0 : rem(32)}`,
    },
  });

const removeLayoutPaddingStyles = {
  marginTop: vminLinearCalcClamped(mobileScreen, -33, tabletScreen, -48, 'px'),
};

const imageBannerStyles = (image: string, position: string) =>
  css({
    width: '100%',
    maxWidth: rem(headerMaxWidth),
    height: rem(72),
    [drawerQuery]: {
      height: rem(48),
    },
    backgroundImage: `url(${image})`,
    borderRadius: `8px 8px 0px 0px`,
    backgroundSize: '100%',
    backgroundPosition: position,
  });

const PageBanner: React.FC<PageBannerProp> = ({
  image,
  position = 'center',
  title,
  description,
  noMarginBottom = false,
  noLayoutPadding = false,
  noBorderTop = false,
  children,
}) => (
  <header css={[headerStyles, noLayoutPadding && removeLayoutPaddingStyles]}>
    {image && <div css={imageBannerStyles(image, position)}></div>}
    <div
      css={[cardStyles, accents.default, noBorderTop && { borderTopWidth: 0 }]}
    >
      <div css={[textContainerStyles(noMarginBottom)]}>
        <h1
          css={css({
            fontSize: '39px',
            lineHeight: '48px',
          })}
        >
          {title}
        </h1>
        {description && <Paragraph accent="tertiary">{description}</Paragraph>}
        {children}
      </div>
    </div>
  </header>
);
export default PageBanner;
