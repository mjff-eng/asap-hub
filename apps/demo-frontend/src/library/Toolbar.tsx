/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FC, FormEvent, useRef, useState } from 'react';
import { Link } from 'react-router';

import Dropdown from '../ui/Dropdown';
import { SearchIcon } from '../ui/icons';
import {
  charcoal,
  lead,
  mint,
  paper,
  pine,
  rem,
  shadowMedium,
  silver,
  steel,
  tin,
} from '../ui/theme';
import { FolderPlusIcon, GridIcon, ListIcon, UploadIcon } from './icons';
import {
  sortLabels,
  statusFilterLabels,
  statusFilters,
  type SortMode,
  type StatusFilter,
  type ViewMode,
} from './state';

const barStyles = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: rem(12),
  paddingBottom: rem(16),
  '@media (max-width: 700px)': { gap: rem(8), paddingBottom: rem(12) },
});

// once the row is tight the search takes a line of its own, which leaves the
// whole next line to the controls instead of stranding Upload below them
const searchWrapStyles = css({
  position: 'relative',
  flex: `1 1 ${rem(220)}`,
  minWidth: rem(180),
  display: 'flex',
  alignItems: 'center',
  '@media (max-width: 900px)': { flex: '1 1 100%' },
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
  ':focus': { borderColor: pine.rgb },
  ':focus-visible': {
    outline: `${rem(2)} solid ${pine.rgb}`,
    outlineOffset: rem(1),
  },
});

const toggleGroupStyles = css({
  display: 'flex',
  border: `1px solid ${steel.rgb}`,
  borderRadius: rem(6),
  overflow: 'hidden',
  backgroundColor: paper.rgb,
});

const toggleButtonStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: rem(36),
  height: rem(36),
  padding: 0,
  border: 'none',
  background: 'none',
  color: lead.rgb,
  cursor: 'pointer',
  ':hover': { backgroundColor: silver.rgb },
});

const toggleActiveStyles = css({
  backgroundColor: mint.rgb,
  color: pine.rgb,
  ':hover': { backgroundColor: mint.rgb },
});

const uploadStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: rem(8),
  padding: `${rem(9)} ${rem(20)}`,
  borderRadius: rem(6),
  backgroundColor: pine.rgb,
  color: paper.rgb,
  fontSize: rem(14),
  fontWeight: 'bold',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  ':hover': { opacity: 0.9 },
  '@media (max-width: 700px)': { flex: 1 },
});

const newFolderStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: rem(8),
  padding: `${rem(9)} ${rem(16)}`,
  borderRadius: rem(6),
  border: `1px solid ${steel.rgb}`,
  backgroundColor: paper.rgb,
  font: 'inherit',
  fontSize: rem(14),
  fontWeight: 'bold',
  color: charcoal.rgb,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  ':hover:enabled': { backgroundColor: silver.rgb },
  ':disabled': { color: tin.rgb, cursor: 'default' },
  '@media (max-width: 700px)': { flex: 1 },
});

const popoverStyles = css({
  position: 'absolute',
  zIndex: 20,
  top: `calc(100% + ${rem(6)})`,
  right: 0,
  width: rem(240),
  padding: rem(10),
  borderRadius: rem(8),
  border: `1px solid ${steel.rgb}`,
  backgroundColor: paper.rgb,
  boxShadow: `0 ${rem(4)} ${rem(16)} ${shadowMedium.rgb}`,
});

const popoverInputStyles = css({
  boxSizing: 'border-box',
  width: '100%',
  padding: `${rem(8)} ${rem(10)}`,
  borderRadius: rem(6),
  border: `1px solid ${pine.rgb}`,
  font: 'inherit',
  fontSize: rem(14),
  color: charcoal.rgb,
});

const NewFolderButton: FC<{
  readonly disabled: boolean;
  readonly locationName: string;
  readonly onCreate: (name: string) => void;
}> = ({ disabled, locationName, onCreate }) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');

  // the input blurs itself shut on the press, so the click has to remember
  // whether the popover was open or a second press would silently reopen it
  const wasOpen = useRef(false);

  const close = () => {
    setOpen(false);
    setValue('');
  };

  return (
    <div css={{ position: 'relative' }}>
      <button
        type="button"
        css={newFolderStyles}
        disabled={disabled}
        aria-expanded={open}
        title={
          disabled
            ? 'This folder is already at the deepest level'
            : `New folder in ${locationName}`
        }
        onMouseDown={() => {
          wasOpen.current = open;
        }}
        onClick={() => {
          if (wasOpen.current) close();
          else setOpen(true);
          wasOpen.current = false;
        }}
      >
        <FolderPlusIcon size={15} />
        New folder
      </button>
      {open && !disabled && (
        <form
          css={popoverStyles}
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            const trimmed = value.trim();
            if (trimmed) onCreate(trimmed);
            close();
          }}
        >
          <input
            autoFocus
            aria-label={`New folder name in ${locationName}`}
            placeholder={`New folder in ${locationName}`}
            css={popoverInputStyles}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onBlur={close}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                close();
              }
            }}
          />
        </form>
      )}
    </div>
  );
};

const sortOptions: SortMode[] = ['newest', 'oldest', 'title'];

export const Toolbar: FC<{
  readonly query: string;
  readonly onQueryChange: (value: string) => void;
  readonly sort: SortMode;
  readonly onSortChange: (sort: SortMode) => void;
  readonly view: ViewMode;
  readonly onViewChange: (view: ViewMode) => void;
  readonly statusFilter: StatusFilter;
  readonly onStatusFilterChange: (filter: StatusFilter) => void;
  readonly isCreator: boolean;
  readonly currentLocationName: string;
  readonly canCreateHere: boolean;
  readonly onCreateFolderHere: (name: string) => void;
}> = ({
  query,
  onQueryChange,
  sort,
  onSortChange,
  view,
  onViewChange,
  statusFilter,
  onStatusFilterChange,
  isCreator,
  currentLocationName,
  canCreateHere,
  onCreateFolderHere,
}) => (
  <div css={barStyles}>
    <div css={searchWrapStyles}>
      <span css={searchIconStyles}>
        <SearchIcon />
      </span>
      <input
        type="search"
        aria-label="Search videos"
        placeholder="Search videos"
        css={searchInputStyles}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
    </div>

    <Dropdown
      label="Sort videos"
      value={sort}
      options={sortOptions.map((option) => ({
        value: option,
        label: sortLabels[option],
      }))}
      onChange={onSortChange}
    />

    <div css={toggleGroupStyles} role="group" aria-label="View mode">
      <button
        type="button"
        aria-label="Grid view"
        aria-pressed={view === 'grid'}
        css={[toggleButtonStyles, view === 'grid' && toggleActiveStyles]}
        onClick={() => onViewChange('grid')}
      >
        <GridIcon />
      </button>
      <button
        type="button"
        aria-label="List view"
        aria-pressed={view === 'list'}
        css={[toggleButtonStyles, view === 'list' && toggleActiveStyles]}
        onClick={() => onViewChange('list')}
      >
        <ListIcon />
      </button>
    </div>

    {isCreator && (
      <Dropdown
        label="Filter by status"
        value={statusFilter}
        options={statusFilters.map((option) => ({
          value: option,
          label: statusFilterLabels[option],
        }))}
        onChange={onStatusFilterChange}
      />
    )}

    {isCreator && (
      <NewFolderButton
        disabled={!canCreateHere}
        locationName={currentLocationName}
        onCreate={onCreateFolderHere}
      />
    )}

    {isCreator && (
      <Link to="/studio/upload" css={uploadStyles}>
        <UploadIcon size={15} />
        Upload
      </Link>
    )}
  </div>
);
