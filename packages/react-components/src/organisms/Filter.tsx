import { css } from '@emotion/react';
import { useEffect, useRef, useState } from 'react';
import { useDebounce } from 'use-debounce';

import { CheckboxGroup } from '.';
import { FILTERS_KEY, FILTER_EVENT, FILTER_TITLE_KEY } from '../analytics';
import { Button } from '../atoms';
import {
  colorWithTransparency,
  colour,
  neutral500,
  neutral700,
} from '../colors';
import { filterIcon } from '../icons';
import {
  tabletScreen,
  rem,
  vminLinearCalc,
  mobileScreen,
  largeDesktopScreen,
} from '../pixels';
import { Option } from '../select';
import { noop } from '../utils';
import { Title } from './CheckboxGroup';

const buttonTextStyles = css({
  display: 'none',
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    display: 'unset',
  },
});

const dropdownContainer = css({
  position: 'absolute',
  width: rem(295),
  right: rem(0),
  top: rem(8),
  zIndex: 1000,

  backgroundColor: colour.neutral[0],
  border: `1px solid ${neutral500.rgb}`,
  boxShadow: `0 2px 6px 0 ${colorWithTransparency(neutral700, 0.34).rgba}`,

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

export interface FilterProps<V extends string> {
  readonly filters?: Set<V>;
  readonly onChangeFilter?: (filter: V) => void;
  readonly filterOptions: ReadonlyArray<Option<V> | Title>;
  readonly buttonText?: string;
}
export default function Filter<V extends string>({
  filters = new Set(),
  onChangeFilter = noop,
  filterOptions,
  buttonText = 'Filters',
}: FilterProps<V>): ReturnType<React.FC> {
  const [menuShown, setMenuShown] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuShown(false);
  }, [filterOptions]);

  // Handle click outside to close the filter dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setMenuShown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [debouncedFilters] = useDebounce(filters, 5000);
  useEffect(() => {
    if (filters.size && filters === debouncedFilters) {
      window.dataLayer?.push({
        [FILTERS_KEY]: [...filters],
        event: FILTER_EVENT,
      });
    }

    return () => {
      window.dataLayer?.push({
        [FILTERS_KEY]: undefined,
        [FILTER_TITLE_KEY]: undefined,
      });
    };
  }, [debouncedFilters, filters]);

  return (
    <div ref={filterRef}>
      <Button
        noMargin
        active={menuShown}
        onClick={() => setMenuShown(!menuShown)}
      >
        {filterIcon}
        <span css={buttonTextStyles}>{buttonText}</span>
      </Button>
      <div
        css={{
          position: 'relative',
        }}
      >
        <div css={[dropdownContainer, menuShown && showMenuStyles]}>
          <CheckboxGroup<V>
            onChange={onChangeFilter}
            options={filterOptions}
            values={filters}
          />
        </div>
      </div>
    </div>
  );
}
