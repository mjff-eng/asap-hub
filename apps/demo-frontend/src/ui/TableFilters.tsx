/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FC } from 'react';

import Dropdown from './Dropdown';
import { SearchIcon } from './icons';
import { charcoal, paper, pine, rem, steel, tin } from './theme';

const barStyles = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: rem(12),
  padding: rem(24),
});

const searchWrapStyles = css({
  position: 'relative',
  flex: `1 1 ${rem(220)}`,
  minWidth: rem(180),
  display: 'flex',
  alignItems: 'center',
});

const searchIconStyles = css({
  position: 'absolute',
  left: rem(10),
  display: 'flex',
  color: tin.rgb,
  pointerEvents: 'none',
});

const searchInputStyles = css({
  boxSizing: 'border-box',
  width: '100%',
  padding: `${rem(9)} ${rem(12)} ${rem(9)} ${rem(34)}`,
  borderRadius: rem(6),
  border: `1px solid ${steel.rgb}`,
  backgroundColor: paper.rgb,
  font: 'inherit',
  fontSize: rem(15),
  color: charcoal.rgb,
  ':focus': { outline: 'none', borderColor: pine.rgb },
});

export type FilterOption<T extends string> = {
  readonly value: T;
  readonly label: string;
};

export type FilterSelect = {
  readonly label: string;
  readonly value: string;
  readonly options: ReadonlyArray<FilterOption<string>>;
  readonly onChange: (value: string) => void;
};

export const TableFilters: FC<{
  readonly searchLabel: string;
  readonly query: string;
  readonly onQueryChange: (value: string) => void;
  readonly selects: ReadonlyArray<FilterSelect>;
}> = ({ searchLabel, query, onQueryChange, selects }) => (
  <div css={barStyles}>
    <div css={searchWrapStyles}>
      <span css={searchIconStyles}>
        <SearchIcon />
      </span>
      <input
        type="search"
        aria-label={searchLabel}
        placeholder={searchLabel}
        css={searchInputStyles}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
    </div>
    {selects.map((select) => (
      <Dropdown
        key={select.label}
        label={select.label}
        value={select.value}
        options={select.options}
        onChange={select.onChange}
      />
    ))}
  </div>
);
