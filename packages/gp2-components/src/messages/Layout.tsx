/** @jsxImportSource @emotion/react */
import {
  ceruleanFernGradientStyles,
  Link,
  pixels,
  colour,
} from '@asap-hub/react-components';
import { staticPages } from '@asap-hub/routing';
import { css } from '@emotion/react';
import { ReactNode } from 'react';
import { gp2Image } from '../images';

const { rem } = pixels;

const containerStyles = css({
  maxWidth: rem(600),
  marginLeft: 'auto',
  marginRight: 'auto',
});

const coloredLineStyles = css({
  height: rem(6),
});

const imageContainerStyle = css({
  height: rem(32),
  paddingTop: rem(6),
  marginTop: rem(24),
  marginBottom: rem(24),
});

const contentContainerStyles = css({
  paddingLeft: rem(24),
  marginTop: rem(72),
  marginBottom: rem(72),
});

const footerContainerStyles = css({
  backgroundColor: colour.general.blue.cerulean[25],
  padding: rem(12),
});

const footerContentContainerStyles = css({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'start',
  '*': { paddingRight: rem(12) },
});

interface LayoutProps {
  readonly children: ReactNode;
  readonly appOrigin: string;
}

const MessageLayout: React.FC<LayoutProps> = ({ children, appOrigin }) => (
  <>
    <div css={containerStyles}>
      <div
        role="presentation"
        css={[ceruleanFernGradientStyles, coloredLineStyles]}
      />
      <div css={{ paddingLeft: '24px' }}>
        <img alt="GP2 Hub logo" css={imageContainerStyle} src={gp2Image} />
      </div>
      <main css={contentContainerStyles}>{children}</main>
    </div>
    <div css={footerContainerStyles}>
      <ul css={[containerStyles, footerContentContainerStyles]}>
        <Link
          href={new URL(
            staticPages({}).privacyPolicy({}).$,
            appOrigin,
          ).toString()}
        >
          Privacy policy
        </Link>
        <Link href={new URL(staticPages({}).terms({}).$, appOrigin).toString()}>
          Terms and conditions
        </Link>
      </ul>
    </div>
  </>
);

export default MessageLayout;
