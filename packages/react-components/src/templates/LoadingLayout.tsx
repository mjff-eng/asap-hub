import { css, keyframes } from '@emotion/react';
import { colour } from '../colors';
import { contentSidePaddingWithNavigation } from '../layout';
import { Header } from '../molecules';
import {
  menuButtonStyles,
  styles as menuButtonContainer,
} from '../organisms/MenuHeader';
import { rem } from '../pixels';
import {
  contentStyles,
  headerStyles,
  menuStyles,
  searchButtonAreaStyles,
  styles,
  userButtonStyles,
} from './Layout';

const shineWidth = '70px';
const animation = (width: string, height: string) =>
  css({
    width,
    height,
    overflow: 'hidden',

    '&:empty': {
      position: 'relative',

      '&:before': {
        content: '""',
        transform: 'skewX(-45deg)',
        backgroundImage: `linear-gradient(90deg, #eee 0px, rgba(255,255,255,.3) calc(${shineWidth}/2), #eee ${shineWidth})`,
        position: 'absolute',
        backgroundRepeat: 'repeat-x',
        left: `calc((${width}/2) + ${shineWidth} * -1)`,
        width: shineWidth,
        height: '100%',
        animation: `${shine(width)} 1s infinite`,
      },
    },
  });

const shine = (width: string) => keyframes`
  0% {
    left: calc( (${width} / 2) + ${shineWidth} * -1);
  }
  100% {
    left: calc(3/2 * ${width});
  }
`;

const menuContainerStyles = css({
  display: 'grid',
  gridColumn: '1 / -1',
  padding: `${rem(21)} ${rem(12)} ${rem(12)} ${rem(12)} `,
});

const userButtonContainerStyles = css({
  display: `grid`,
  gridTemplateColumns: `auto auto auto`,
  columnGap: rem(16),
  paddingRight: rem(24),
});

const contentHeaderContainerStyles = css({
  display: `grid`,
  width: '100%',
  boxSizing: 'border-box',
  gridColumn: '1 / -1',
  padding: `${rem(36)} ${contentSidePaddingWithNavigation(8)} ${rem(48)}`,
  borderBottom: `1px solid ${colour.border.tertiary}`,
  backgroundColor: colour.neutral[0],
  rowGap: rem(12),
});

const contentBodyContainerStyles = css({
  display: `grid`,
  boxSizing: 'border-box',
  rowGap: rem(12),
  width: '100%',
});

const menuRowStyles = css({
  display: 'grid',
  padding: `${rem(16)} ${rem(12)}`,
  columnGap: rem(16),
  gridTemplateColumns: 'min-content 1fr',
});

const iconStyles = [
  css({
    width: rem(24),
    height: rem(24),
    backgroundColor: colour.background.tertiary,
    borderRadius: rem(4),
    alignSelf: 'center',
  }),
  animation(rem(24), rem(24)),
];

const avatarStyles = [
  css({
    width: rem(48),
    height: rem(48),
    backgroundColor: colour.background.tertiary,
    borderRadius: '50%',
    alignSelf: 'center',
  }),
  animation(rem(48), rem(48)),
];

const menuTextStyles = [
  css({
    width: '100%',
    height: rem(18),
    backgroundColor: colour.background.tertiary,
    borderRadius: rem(4),
    alignSelf: 'center',
  }),
  animation(rem(100), rem(18)),
];

const headerTitleStyles = [
  css({
    width: '50%',
    height: rem(32),
    backgroundColor: colour.background.tertiary,
    marginBottom: rem(16),
    borderRadius: rem(4),
    alignSelf: 'center',
  }),
  animation('50%', rem(32)),
];

const bodyTitleStyles = [
  css({
    width: '33%',
    height: rem(32),
    backgroundColor: colour.background.tertiary,
    marginBottom: rem(16),
    borderRadius: rem(4),
    alignSelf: 'center',
  }),
  animation('50%', rem(32)),
];

const headerDescriptionStyles = (width: string) => [
  css({
    width,
    height: rem(12),
    backgroundColor: colour.background.tertiary,
    borderRadius: rem(4),
    alignSelf: 'center',
  }),
  animation(width, rem(12)),
];

const bodyDescriptionStyles = (width: string) => [
  css({
    width,
    height: rem(238),
    backgroundColor: colour.background.tertiary,
    borderRadius: rem(4),
    alignSelf: 'center',
  }),
  animation(width, rem(238)),
];

const searchIconContainerStyles = css({
  display: 'flex',
  padding: rem(24),
});

export const LoadingUserButton: React.FC<Record<string, never>> = () => (
  <div css={userButtonContainerStyles}>
    <div css={menuTextStyles} />
    <div css={avatarStyles} />
    <div css={[iconStyles, { marginLeft: rem(6) }]} />
  </div>
);

export const LoadingMenu: React.FC<Record<string, never>> = () => (
  <div css={menuContainerStyles}>
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={`menu-row-${i}`} css={menuRowStyles}>
        <div css={iconStyles} />
        <div css={menuTextStyles} />
      </div>
    ))}
  </div>
);

export const LoadingContentHeader: React.FC = () => (
  <div css={contentHeaderContainerStyles}>
    <div css={headerTitleStyles} />
    <div css={headerDescriptionStyles('100%')} />
    <div css={headerDescriptionStyles('100%')} />
    <div css={headerDescriptionStyles('50%')} />
  </div>
);

export const LoadingContentBody: React.FC = () => (
  <div css={contentBodyContainerStyles}>
    <div css={bodyTitleStyles} />
    <div css={bodyDescriptionStyles('100%')} />
    <div css={bodyDescriptionStyles('100%')} />
  </div>
);

const contentBodyContainerStylesTable = css({
  display: `flex`,
  boxSizing: 'border-box',
  flexDirection: 'column',
  alignItems: 'center',
  gap: rem(12),
  width: '100%',
});

const bodyDescriptionStylesTable = (width: string) => [
  css({
    width,
    height: rem(238),
    backgroundColor: colour.background.tertiary,
    borderRadius: rem(4),
    alignSelf: 'center',
  }),
  animation(width, rem(238)),
];

const tableHeaderAndFooterStyles = [
  css({
    width: '100%',
    height: rem(32),
    backgroundColor: colour.background.tertiary,
    marginBottom: rem(16),
    marginTop: rem(16),
    borderRadius: rem(4),
    alignSelf: 'center',
  }),
  animation('100%', rem(32)),
];

export const LoadingContentBodyTable: React.FC = () => (
  <div css={contentBodyContainerStylesTable}>
    <div css={tableHeaderAndFooterStyles} />
    <div css={bodyDescriptionStylesTable('100%')} />
    <div css={tableHeaderAndFooterStyles} />
  </div>
);

const LoadingLayout: React.FC<Record<string, never>> = () => (
  <article css={styles}>
    <div css={headerStyles}>
      <div css={menuButtonContainer}>
        <div css={[menuButtonStyles, { justifyContent: 'center' }]}>
          <div css={iconStyles} />
        </div>
        <Header enabled={false} />
      </div>
    </div>
    <div css={userButtonStyles}>
      <LoadingUserButton />
    </div>
    <div css={searchButtonAreaStyles}>
      <div css={searchIconContainerStyles}>
        <div css={iconStyles} />
      </div>
    </div>
    <main css={contentStyles}></main>
    <div css={menuStyles}>
      <LoadingMenu />
    </div>
  </article>
);

export default LoadingLayout;
