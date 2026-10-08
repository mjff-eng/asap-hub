import { ReactNode } from 'react';
import { css, ThemeProvider } from '@emotion/react';
import { staticPages } from '@asap-hub/routing';

import { Link } from '../atoms';
import { asapImage } from '../images';
import { ceruleanFernGradientStyles } from '../appearance';
import { rem } from '../pixels';
import { themeColour } from '../theme';

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
  backgroundColor: themeColour('crn', 'colour/background/tertiary'),
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

const emailTheme = {
  colors: {
    link: themeColour('crn', 'colour/foreground/brand'),
    buttonBackground: themeColour(
      'crn',
      'colour/background/button/primary/default',
    ),
    buttonBorder: themeColour('crn', 'colour/border/button/primary/default'),
  },
};

const MessageLayout: React.FC<LayoutProps> = ({ children, appOrigin }) => (
  <ThemeProvider theme={emailTheme}>
    <div css={containerStyles}>
      <div
        role="presentation"
        css={[ceruleanFernGradientStyles, coloredLineStyles]}
      />
      <div css={{ paddingLeft: '24px' }}>
        <img alt="ASAP Hub logo" css={imageContainerStyle} src={asapImage} />
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
          Privacy Notice
        </Link>
        <Link href={new URL(staticPages({}).terms({}).$, appOrigin).toString()}>
          Terms and conditions
        </Link>
      </ul>
    </div>
  </ThemeProvider>
);

export default MessageLayout;
