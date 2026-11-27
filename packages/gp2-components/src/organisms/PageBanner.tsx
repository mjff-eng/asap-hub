import {
  accents,
  mediaBelow,
  pageContainerStyles,
  Paragraph,
  pixels,
  text,
} from '@asap-hub/react-components';
import { css } from '@emotion/react';
import { removeLayoutPaddingStyles } from '../layout';

const { rem } = pixels;

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

// The card is as wide as the screen, so the text takes the GP2 page grid
// again to line up with the page content under it.
const textContainerStyles = (noMarginBottom: boolean) =>
  css(pageContainerStyles.gp2, {
    marginTop: rem(48),
    marginBottom: noMarginBottom ? 0 : rem(32),
    [mediaBelow.tablet]: {
      marginTop: rem(32),
    },
  });

const imageBannerStyles = (image: string, position: string) =>
  css({
    width: '100%',
    height: rem(72),
    [mediaBelow.laptop]: {
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
        <h1 css={text.headlineStyles[2]}>{title}</h1>
        {description && <Paragraph accent="tertiary">{description}</Paragraph>}
        {children}
      </div>
    </div>
  </header>
);
export default PageBanner;
