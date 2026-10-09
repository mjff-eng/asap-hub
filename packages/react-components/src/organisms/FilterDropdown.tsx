import { css, SerializedStyles } from '@emotion/react';
import { useEffect, useRef } from 'react';

import { Button } from '../atoms';
import {
  colorWithTransparency,
  mint,
  paper,
  pine,
  steel,
  tin,
} from '../colors';
import { filterIcon } from '../icons';
import {
  largeDesktopScreen,
  mobileScreen,
  rem,
  tabletScreen,
  vminLinearCalc,
} from '../pixels';

const buttonTextStyles = css({
  display: 'none',
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    display: 'unset',
  },
});

const countBadgeStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  minWidth: '24px',
  height: '24px',
  marginLeft: '8px',
  borderRadius: rem(12),
  backgroundColor: mint.rgb,
  color: pine.rgb,
  fontSize: rem(14),
  lineHeight: 24 / 14,
  fontWeight: 'bold',
  alignSelf: 'center',
});

const dropdownContainer = css({
  position: 'absolute',
  width: rem(295),
  right: rem(0),
  top: rem(8),
  zIndex: 1000,

  backgroundColor: paper.rgb,
  border: `1px solid ${steel.rgb}`,
  boxShadow: `0 2px 6px 0 ${colorWithTransparency(tin, 0.34).rgba}`,

  display: 'none',
  flexDirection: 'column',

  boxSizing: 'border-box',
  padding: `${rem(6)} ${rem(18)} ${vminLinearCalc(
    mobileScreen,
    6,
    largeDesktopScreen,
    12,
    'px',
  )}`,
});

const showMenuStyles = css({
  display: 'flex',
  zIndex: 10,
});

type FilterDropdownProps = {
  readonly menuShown: boolean;
  readonly onToggle: () => void;
  readonly onClose: () => void;
  readonly buttonText?: string;
  readonly count?: number;
  readonly overrideDropdownStyles?: SerializedStyles;
  readonly children?: React.ReactNode;
};

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  menuShown,
  onToggle,
  onClose,
  buttonText = 'Filters',
  count,
  overrideDropdownStyles,
  children,
}) => {
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div ref={filterRef}>
      <Button noMargin active={menuShown} onClick={onToggle}>
        {filterIcon}
        <span css={buttonTextStyles}>{buttonText}</span>
        {count ? (
          <span css={countBadgeStyles} data-testid="filter-count">
            {count}
          </span>
        ) : null}
      </Button>
      <div
        css={{
          position: 'relative',
        }}
      >
        <div
          css={[
            dropdownContainer,
            menuShown && showMenuStyles,
            overrideDropdownStyles,
          ]}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default FilterDropdown;
