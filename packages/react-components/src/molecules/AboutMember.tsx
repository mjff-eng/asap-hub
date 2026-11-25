import { css } from '@emotion/react';
import { network } from '@asap-hub/routing';
import { ReactNode } from 'react';

import { Anchor, Avatar } from '../atoms';
import { casTextStyles } from '../cas-tokens.generated';
import { colour } from '../colors';
import { rem, tabletScreen } from '../pixels';
import { textStyle } from '../text';

export const aboutMembersGridStyles = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  columnGap: rem(24),
  rowGap: rem(24),
  margin: 0,
  padding: `${rem(12)} 0`,
  listStyle: 'none',
  [`@media (max-width: ${tabletScreen.max}px)`]: {
    gridTemplateColumns: 'minmax(0, 1fr)',
  },
});

const memberStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(16),
});

const alignTopStyles = css({
  alignItems: 'flex-start',
});

const avatarStyles = css({
  flexShrink: 0,
  width: rem(48),
  height: rem(48),
});

const detailsStyles = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: rem(4),
  minWidth: 0,
});

const nameStyles = css(
  { margin: 0, ...textStyle({ ...casTextStyles.body.regular, fontSize: 17 }) },
  {
    color: colour.foreground.brand,
    textDecoration: 'none',
    ':hover': {
      textDecoration: 'underline',
    },
  },
);

const secondLineStyles = css(
  { margin: 0, ...textStyle(casTextStyles.body.regular) },
  {
    color: colour.foreground.secondary,
  },
);

type AboutMemberProps = {
  readonly member: {
    readonly id: string;
    readonly firstName?: string;
    readonly lastName?: string;
    readonly displayName: string;
    readonly avatarUrl?: string;
  };
  readonly secondLine?: string;
  readonly children?: ReactNode;
};

const AboutMember: React.FC<AboutMemberProps> = ({
  member,
  secondLine,
  children,
}) => (
  <li css={[memberStyles, children && alignTopStyles]}>
    <div css={avatarStyles}>
      <Avatar
        firstName={member.firstName}
        lastName={member.lastName}
        imageUrl={member.avatarUrl}
      />
    </div>
    <div css={detailsStyles}>
      <Anchor
        href={network({}).users({}).user({ userId: member.id }).$}
        css={nameStyles}
      >
        {member.displayName}
      </Anchor>
      {secondLine && <p css={secondLineStyles}>{secondLine}</p>}
      {children}
    </div>
  </li>
);

export default AboutMember;
