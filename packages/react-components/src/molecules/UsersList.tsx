import { FC } from 'react';
import { css } from '@emotion/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ExternalAuthorResponse, UserResponse } from '@asap-hub/model';
import { isExternalUser } from '@asap-hub/validation';

import { Avatar, Link } from '../atoms';
import { ImageLink } from '.';
import { rem } from '../pixels';
import { alumniBadgeIcon, userPlaceholderIcon } from '../icons';
import { colour } from '../colors';

const getPlaceholderAvatarUrl = () =>
  `data:image/svg+xml;base64,${btoa(
    renderToStaticMarkup(userPlaceholderIcon),
  )}`;

const listStyles = css({
  listStyle: 'none',
  margin: 0,
  padding: 0,

  overflow: 'hidden',
  display: 'flex',
  flexWrap: 'wrap',
  gap: `${rem(8)} ${rem(4)}`, // vertical gap, horizontal gap

  color: colour.foreground.tertiary,
});
const itemStyles = (isSeparator: boolean, noMargin: boolean) =>
  css({
    paddingBottom: noMargin ? 0 : rem(12),
    '&:not(:last-of-type)': {
      paddingRight: isSeparator ? 0 : rem(15),
    },
    overflow: 'hidden',
  });
const userStyles = css({
  overflow: 'hidden',
  display: 'grid',
  gridTemplateColumns: `min-content 1fr min-content min-content`,
  gridColumnGap: rem(8),
  alignItems: 'center',
});
const iconContainerStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(8),
});
const nameStyles = css({
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
});
const iconStyles = css({
  display: 'inline-flex',
});
const separatorStyles = css({
  fontSize: rem(20),
  color: colour.foreground.tertiary,
});

interface UsersListProps {
  label?: string;
  separator?: string;
  users: ReadonlyArray<
    | (Pick<
        UserResponse,
        | 'displayName'
        | 'firstName'
        | 'lastName'
        | 'avatarUrl'
        | 'id'
        | 'email'
        | 'alumniSinceDate'
      > & { href: string })
    | ExternalAuthorResponse
  >;
  max?: number;
  noMargin?: boolean;
}
const UsersList: FC<UsersListProps> = ({
  users,
  max = Number.POSITIVE_INFINITY,
  label = 'Authors',
  separator,
  noMargin = false,
}) => (
  <ul css={listStyles}>
    {users.slice(0, max).map((user, i) => {
      const externalUser = isExternalUser(user);
      const imageUrl = externalUser
        ? getPlaceholderAvatarUrl()
        : user.avatarUrl;
      return (
        <li key={`author-${i}`} css={itemStyles(Boolean(separator), noMargin)}>
          {externalUser ? (
            <div css={userStyles}>
              <Avatar {...user} imageUrl={imageUrl} />
              <span css={nameStyles}>{user.displayName}</span>
            </div>
          ) : (
            <div css={userStyles}>
              <ImageLink link={user.href}>
                <Avatar {...user} imageUrl={imageUrl} />
              </ImageLink>
              <Link ellipsed href={user.href}>
                <span css={nameStyles}>{user.displayName}</span>
              </Link>
              <div css={iconContainerStyles}>
                {user.alumniSinceDate && (
                  <span css={iconStyles}>{alumniBadgeIcon}</span>
                )}
                {i < users.length - 1 && i < max - 1 && separator && (
                  <span css={separatorStyles}>{separator}</span>
                )}
              </div>
            </div>
          )}
        </li>
      );
    })}
    {users.length > max && (
      <li>
        <div css={userStyles}>
          <Avatar placeholder={`+${users.length - max}`} />
          <span css={nameStyles}>{label}</span>
        </div>
      </li>
    )}
  </ul>
);

export default UsersList;
