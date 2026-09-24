import { Fragment, ReactNode, isValidElement } from 'react';
import { css, SerializedStyles } from '@emotion/react';
import { UserAward, UserResponse, UserTeam } from '@asap-hub/model';
import { network } from '@asap-hub/routing';

import { rem, tabletScreen } from '../pixels';
import { colour } from '../colors';
import { Link, Anchor, Ellipsis } from '../atoms';
import { alumniBadgeIcon } from '../icons';
import { hoverStyle } from './ImageLink';
import { styles } from '../atoms/Link';
import { hover } from './LinkHeadline';
import UserAvatar from './UserAvatar';

const containerStyles = css({
  margin: 0,
  padding: 0,
  display: 'grid',
  gridTemplateColumns: '1fr',
  listStyle: 'none',
});
const multiColumnContainerStyles = css({
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    gridTemplateColumns: '1fr 1fr',
    columnGap: rem(18),
  },
});

const memberGridStyles = css({
  display: 'grid',
  gridTemplateColumns: `${rem(48)} 1fr`,
  gridColumnGap: rem(18),
  gridAutoFlow: 'row dense',
  alignSelf: 'start',
});

const avatarStyles = css({
  gridRowEnd: 'span 3',
});

const nameStyles = css({
  fontWeight: 'bold',
  display: 'inline-flex',
});

const badgeStyles = css({
  lineHeight: rem(8),
  marginLeft: rem(8),
});

const addToColumnStyles = css({
  gridColumn: 2,
});
const textStyles = css({
  color: colour.foreground.tertiary,
  minHeight: rem(24),
});

const labStyles = css({
  padding: `0 0 ${rem(24)}`,
});

interface MembersListProps {
  readonly members: ReadonlyArray<
    {
      firstLine: string;
      secondLine?: string | ReactNode;
      thirdLine?:
        | string
        | ReactNode
        | ReadonlyArray<Pick<UserTeam, 'id' | 'displayName'>>;
    } & Pick<UserResponse, 'id'> &
      Partial<
        Pick<
          UserResponse,
          'firstName' | 'lastName' | 'avatarUrl' | 'alumniSinceDate'
        >
      > & {
        latestAward?: UserAward;
      }
  >;
  singleColumn?: boolean;
  readonly overrideNameStyles?: SerializedStyles;
  readonly userRoute?: ({ userId }: { userId: string }) => {
    $: string;
  };
}
const MembersList: React.FC<MembersListProps> = ({
  members,
  singleColumn = false,
  overrideNameStyles,
  userRoute = network({}).users({}).user,
}) => (
  <ul css={[containerStyles, singleColumn || multiColumnContainerStyles]}>
    {members.map(
      ({
        id,
        firstLine,
        secondLine,
        thirdLine,
        alumniSinceDate,
        ...member
      }) => {
        const href = userRoute({ userId: id }).$;

        return (
          <li key={id} css={memberGridStyles}>
            <Anchor href={href} css={{ display: 'contents' }}>
              <div css={[avatarStyles, hoverStyle]}>
                <UserAvatar
                  imageUrl={member.avatarUrl}
                  firstName={member.firstName}
                  lastName={member.lastName}
                  badgeUrl={member.latestAward?.smallIconUrl}
                  badgeAlt={member.latestAward?.name}
                  badgeSize={18}
                  avatarSize={48}
                  overrideBadgeStyles={css({ right: rem(0), bottom: rem(0) })}
                />
              </div>
            </Anchor>
            <Anchor
              href={href}
              css={[styles, hover, nameStyles, overrideNameStyles]}
            >
              {firstLine}
              {alumniSinceDate && (
                <span css={badgeStyles}>{alumniBadgeIcon}</span>
              )}
            </Anchor>
            {isValidElement(secondLine) ? (
              <div css={[addToColumnStyles, textStyles]}>{secondLine}</div>
            ) : (
              <Anchor href={href} css={{ display: 'contents' }}>
                <div css={[addToColumnStyles, secondLine && textStyles]}>
                  <Ellipsis>{secondLine}</Ellipsis>
                </div>
              </Anchor>
            )}
            <div css={[addToColumnStyles, thirdLine && textStyles, labStyles]}>
              {isValidElement(thirdLine) ? (
                thirdLine
              ) : (
                <Ellipsis>
                  {thirdLine instanceof Array ? (
                    thirdLine.map((team) => (
                      <Fragment key={team.id}>
                        <Link
                          href={
                            network({}).teams({}).team({ teamId: team.id }).$
                          }
                        >
                          Team {team.displayName}
                        </Link>{' '}
                      </Fragment>
                    ))
                  ) : (
                    <Anchor href={href} css={{ display: 'contents' }}>
                      {thirdLine}
                    </Anchor>
                  )}
                </Ellipsis>
              )}
            </div>
          </li>
        );
      },
    )}
  </ul>
);

export default MembersList;
