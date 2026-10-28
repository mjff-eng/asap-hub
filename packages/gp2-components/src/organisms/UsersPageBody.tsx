import { gp2 } from '@asap-hub/model';
import { PageControls, pixels, Subtitle } from '@asap-hub/react-components';
import { css } from '@emotion/react';
import { ComponentProps } from 'react';
import noUsersIcon from '../icons/no-users-icon';
import { EmptyState } from '../molecules';
import UserCard from './UserCard';

const { rem } = pixels;
type UsersPageBodyProps = {
  users: gp2.ListUserResponse;
} & ComponentProps<typeof PageControls>;

const containerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(32),
  marginTop: rem(32),
});

const UsersPageBody: React.FC<UsersPageBodyProps> = ({
  users,
  ...pageProps
}) => {
  const firstItem = !users.total
    ? 0
    : pageProps.currentPageIndex + 1 === pageProps.numberOfPages
      ? users.total - users.items.length + 1
      : pageProps.currentPageIndex * users.items.length + 1;
  const lastItem =
    pageProps.currentPageIndex + 1 === pageProps.numberOfPages
      ? users.total
      : (pageProps.currentPageIndex + 1) * users.items.length;
  return (
    <article css={containerStyles}>
      {users.total === 0 ? (
        <EmptyState
          icon={noUsersIcon}
          title="No results have been found."
          description="Please double-check your search for any typos or try a different search term."
        />
      ) : (
        <>
          <Subtitle styleAsHeading="body/regular" bold>
            Showing {firstItem}-{lastItem} of {users.total} results
          </Subtitle>
          {users.items.map((user) => (
            <UserCard
              key={user.id}
              {...user}
              tags={user.tags.map((tag) => tag.name)}
            />
          ))}
          <section>
            <PageControls {...pageProps} />
          </section>
        </>
      )}
    </article>
  );
};

export default UsersPageBody;
