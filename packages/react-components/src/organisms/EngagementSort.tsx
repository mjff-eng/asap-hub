import { css, Theme } from '@emotion/react';
import { useEffect, useRef, useState } from 'react';

import {
  colorWithTransparency,
  neutral900,
  colour,
  neutral500,
  neutral700,
  success100,
} from '../colors';
import { GeneralSortingIcon } from '../icons';
import { rem } from '../pixels';

const sortButton = css({
  background: 'none',
  border: 'none',
  cursor: 'pointer',
});

const menuContainer = css({
  position: 'relative',
});

const menuStyles = css({
  position: 'absolute',
  width: rem(233),
  right: `-${rem(6)}`,
  top: `-${rem(6)}`,

  backgroundColor: colour.neutral[0].rgb,
  border: `1px solid ${neutral500.rgb}`,
  boxShadow: `0 2px 6px 0 ${colorWithTransparency(neutral700, 0.34).rgba}`,

  display: 'none',
  flexDirection: 'column',

  padding: `${rem(8)} 0`,
  boxSizing: 'border-box',
});

const showMenuStyles = css({
  display: 'flex',
});

const optionStyles = css({
  cursor: 'pointer',

  display: 'flex',
  alignItems: 'center',
  gap: rem(8),
  padding: `${rem(8)} ${rem(16)}`,

  color: neutral900.rgba,
  border: 'none',
  backgroundColor: 'unset',

  ':hover': {
    backgroundColor: success100.rgba,
    color: colour.brand.crn[800].rgba,
  },
});

const hoverStyles = ({
  primary100 = success100,
  primary900 = colour.brand.crn[800],
}: Theme['colors'] = {}) =>
  css({
    ':hover': {
      backgroundColor: primary100.rgba,
      color: primary900.rgba,
    },
  });

export interface EngagementSortProps {
  isActive: boolean;
  description?: string;
  sortingOptions: {
    key: string;
    iconTitle: string;
    label: string;
    onClick: () => void;
    Icon: React.FC<{ title: string }>;
  }[];
}
const EngagementSort: React.FC<EngagementSortProps> = ({
  sortingOptions,
  description,
  isActive,
}) => {
  const [menuShown, setMenuShown] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuShown(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuShown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div>
      <button
        css={sortButton}
        onClick={() => {
          setMenuShown(!menuShown);
        }}
      >
        <GeneralSortingIcon active={isActive} description={description} />
      </button>
      <div css={menuContainer} ref={menuRef}>
        <div role="menu" css={[menuStyles, menuShown && showMenuStyles]}>
          {sortingOptions.map(({ key, label, Icon, iconTitle, onClick }) => (
            <button
              role="menuitem"
              key={key}
              css={({ colors }) => [optionStyles, hoverStyles(colors)]}
              onClick={() => {
                setMenuShown(false);
                onClick();
              }}
            >
              {<Icon title={iconTitle} />}
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EngagementSort;
