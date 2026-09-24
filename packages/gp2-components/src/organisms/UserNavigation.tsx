import {
  Avatar,
  chevronDownIcon,
  chevronUpIcon,
  cssColour,
  drawerQuery,
  navigationGrey,
  pixels,
  colour,
} from '@asap-hub/react-components';
import { useCurrentUserGP2 } from '@asap-hub/react-context';
import { css } from '@emotion/react';
import { ComponentProps, useEffect, useRef, useState } from 'react';

import UserMenu from '../molecules/UserMenu';

const { rem } = pixels;

const buttonStyles = css({
  width: rem(80),
  margin: 0,
  padding: 0,
  border: 'none',
  backgroundColor: 'unset',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: rem(16),
});

const userMenuStyles = css({
  backgroundColor: colour.neutral[0],
  display: 'none',
  position: 'absolute',
  border: `1px solid ${colour.border.tertiary}`,
  boxShadow: `0 2px 6px 0 ${cssColour(colour.neutral[200], 0.34)}`,
  right: 5,
});

const userMenuShownStyles = css({
  zIndex: 1,
  [drawerQuery]: {
    backgroundColor: navigationGrey,
  },
  display: 'unset',
});

type UserNavigationProps = Omit<
  ComponentProps<typeof UserMenu>,
  'closeUserMenu'
>;

const UserNavigation: React.FC<UserNavigationProps> = (userNavigationProps) => {
  const reference = useRef<HTMLDivElement>(null);
  const [menuShown, setMenuShown] = useState(false);
  const { firstName, lastName, avatarUrl } = useCurrentUserGP2() || {};

  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (
        reference.current &&
        !reference.current.contains(event.target as Node)
      ) {
        setMenuShown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setMenuShown, reference]);
  return (
    <div css={css({ position: 'relative' })} ref={reference}>
      <button
        aria-label="Toggle User Menu"
        css={buttonStyles}
        onClick={(event) => {
          setMenuShown(!menuShown);
          event.preventDefault();
        }}
      >
        <Avatar
          imageUrl={avatarUrl}
          firstName={firstName}
          lastName={lastName}
          overrideStyles={css({ width: rem(40) })}
        />
        {menuShown ? chevronUpIcon : chevronDownIcon}
      </button>
      <div css={css([userMenuStyles, menuShown && userMenuShownStyles])}>
        <UserMenu {...userNavigationProps} closeUserMenu={setMenuShown} />
      </div>
    </div>
  );
};

export default UserNavigation;
