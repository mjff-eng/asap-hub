import { css } from '@emotion/react';
import { useCallback, useState } from 'react';

import { Button } from '../atoms';
import {
  charcoal,
  lead,
  mint,
  neutral200,
  neutral800,
  paper,
  pine,
  steel,
} from '../colors';
import { chevronLeftIcon, chevronRightIcon } from '../icons';
import { rem } from '../pixels';
import {
  EventMonthFilterSelection,
  hasSelectionInYear,
  monthKey,
  toggleMonth,
  toggleYear,
  yearKey,
} from './event-month-filter-selection';
import FilterDropdown from './FilterDropdown';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const panelStyles = css({
  width: rem(284),
  maxWidth: `calc(100vw - ${rem(32)})`,
  padding: rem(16),
  border: `1px solid ${charcoal.rgb}`,
  borderRadius: `4px 0 4px  4px`,
});

const resetButtonStyles = css({
  margin: 0,
  border: 0,
  background: 'none',
  font: 'inherit',
  color: 'inherit',
  textAlign: 'inherit',
  cursor: 'pointer',
  ':disabled': {
    cursor: 'default',
  },
});

const navStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingBottom: rem(16),
  borderBottom: `1px solid ${steel.rgb}`,
});

const navButtonStyles = css(resetButtonStyles, {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  height: rem(24),
  padding: 0,
  border: `1px solid ${steel.rgb}`,
  borderRadius: rem(4),
  backgroundColor: paper.rgb,
  ':disabled': {
    cursor: 'default',
    opacity: 0.4,
  },
  'svg path': {
    fill: charcoal.rgb,
    stroke: charcoal.rgb,
    strokeWidth: 0.7,
    strokeLinejoin: 'round',
  },
});

const iconButtonStyles = css(navButtonStyles, {
  width: rem(24),
  '> svg': {
    width: rem(20),
    height: rem(20),
  },
});

const yearToggleStyles = css(navButtonStyles, {
  fontSize: rem(14),
  lineHeight: 16 / 14,
  minHeight: '24px',
  gap: rem(4),
  padding: `${rem(4)} ${rem(8)}`,
  fontWeight: 'bold',
  color: charcoal.rgb,
  '> svg': {
    width: rem(16),
    height: rem(16),
    transform: 'rotate(-90deg)',
    transition: 'transform 150ms',
  },
});

const yearToggleOpenStyles = css({
  border: `1px solid ${charcoal.rgb}`,

  '> svg': {
    transform: 'rotate(90deg)',
  },
});

const labelStyles = css({
  fontWeight: 'bold',
  color: charcoal.rgb,
});

const yearLabelStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  fontSize: rem(14),
  lineHeight: 16 / 14,
});

const countStyles = css({
  color: lead.rgb,
  fontSize: rem(14),
  lineHeight: 16 / 14,
});

const yearSelectedCountStyles = css({
  fontWeight: 'bold',
});

const footerLabelStyles = css({
  fontWeight: 'bold',
  color: charcoal.rgb,
  fontSize: rem(14),
  lineHeight: 16 / 14,
});

const selectableStyles = css({
  borderRadius: rem(4),
  ':hover:not(:disabled)': {
    backgroundColor: neutral200.rgb,
  },
  ':disabled span': {
    color: neutral800.rgb,
  },
});

const selectedStyles = css({
  backgroundColor: mint.rgb,
  ':hover:not(:disabled)': {
    backgroundColor: mint.rgb,
  },
  span: {
    color: pine.rgb,
  },
});

const listResetStyles = css({
  listStyle: 'none',
  margin: 0,
  padding: 0,
});

const monthGridStyles = css(listResetStyles, {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  rowGap: rem(16),
  columnGap: rem(8),
  padding: `${rem(16)} 0`,
});

const monthStyles = css(resetButtonStyles, selectableStyles, {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  minHeight: rem(48),
  padding: rem(4),
  textAlign: 'center',
});

const footerStyles = css({
  paddingTop: rem(16),
  borderTop: `1px solid ${steel.rgb}`,
});

const rowStyles = css(resetButtonStyles, selectableStyles, {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  padding: rem(2),
});

const yearListStyles = css(listResetStyles, {
  display: 'flex',
  flexDirection: 'column',
  padding: `${rem(12)} 0`,
  gap: rem(8),
});

const selectionMarkerStyles = css({
  fontSize: '10px',
  marginRight: '4px',
  color: pine.rgb,
});

const clearAllStyles = css({
  display: 'flex',
  justifyContent: 'flex-end',
  fontSize: rem(14),
  lineHeight: 16 / 14,
  fontWeight: 600,
});

const formatCount = (count: number): string => {
  if (count === 0) {
    return 'None';
  }
  return `${count} ${count === 1 ? 'event' : 'events'}`;
};

const isFutureMonth = (year: number, month: number, currentDate: Date) =>
  year > currentDate.getFullYear() ||
  (year === currentDate.getFullYear() && month > currentDate.getMonth());

type EventMonthFilterProps = {
  readonly year: number;
  readonly yearCounts: Readonly<Record<number, number>>;
  readonly monthCounts: Readonly<Partial<Record<number, number>>>;
  readonly selection: EventMonthFilterSelection;
  readonly onChangeYear: (year: number) => void;
  readonly onChangeSelection: (selection: EventMonthFilterSelection) => void;
  readonly currentDate?: Date;
  readonly buttonText?: string;
};

const EventMonthFilter: React.FC<EventMonthFilterProps> = ({
  year,
  yearCounts,
  monthCounts,
  selection,
  onChangeYear,
  onChangeSelection,
  currentDate = new Date(),
  buttonText = 'Filter',
}) => {
  const [menuShown, setMenuShown] = useState(false);
  const [view, setView] = useState<'months' | 'years'>('months');

  const closeMenu = useCallback(() => {
    setMenuShown(false);
    setView('months');
  }, []);

  const years = Object.keys(yearCounts)
    .map(Number)
    .sort((a, b) => a - b);
  const minYear = years[0] ?? year;
  const maxYear = years[years.length - 1] ?? year;
  const isYearView = view === 'years';
  const isYearSelected = selection.has(yearKey(year));
  const yearTotal = yearCounts[year] ?? 0;

  return (
    <FilterDropdown
      menuShown={menuShown}
      onToggle={() => (menuShown ? closeMenu() : setMenuShown(true))}
      onClose={closeMenu}
      buttonText={buttonText}
      count={selection.size}
      overrideDropdownStyles={panelStyles}
    >
      <div css={navStyles}>
        <button
          type="button"
          css={iconButtonStyles}
          aria-label="Previous year"
          disabled={isYearView || year <= minYear}
          onClick={() => onChangeYear(year - 1)}
        >
          {chevronLeftIcon}
        </button>
        <button
          type="button"
          css={[yearToggleStyles, isYearView && yearToggleOpenStyles]}
          aria-label={`Select year, ${year}`}
          aria-expanded={isYearView}
          onClick={() => setView(isYearView ? 'months' : 'years')}
        >
          {year}
          {chevronLeftIcon}
        </button>
        <button
          type="button"
          css={iconButtonStyles}
          aria-label="Next year"
          disabled={isYearView || year >= maxYear}
          onClick={() => onChangeYear(year + 1)}
        >
          {chevronRightIcon}
        </button>
      </div>

      {isYearView ? (
        <>
          <ul css={yearListStyles}>
            {years.map((listYear) => {
              const count = yearCounts[listYear] ?? 0;
              return (
                <li key={listYear}>
                  <button
                    type="button"
                    css={rowStyles}
                    disabled={count === 0}
                    onClick={() => {
                      onChangeYear(listYear);
                      setView('months');
                    }}
                  >
                    <span css={[labelStyles, yearLabelStyles]}>
                      {hasSelectionInYear(selection, listYear) && (
                        <span
                          css={selectionMarkerStyles}
                          aria-label="Has selection"
                        >
                          ●
                        </span>
                      )}
                      <span>{listYear}</span>
                    </span>
                    <span
                      css={[
                        countStyles,
                        hasSelectionInYear(selection, listYear) &&
                          yearSelectedCountStyles,
                      ]}
                    >
                      {formatCount(count)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div css={[footerStyles, clearAllStyles]}>
            <Button linkStyle onClick={() => onChangeSelection(new Set())}>
              <span css={css({ fontWeight: 'bold' })}>Clear all</span>
            </Button>
          </div>
        </>
      ) : (
        <>
          <ul css={monthGridStyles}>
            {MONTHS.map((label, month) => {
              const count = monthCounts[month] ?? 0;
              const isSelected = selection.has(monthKey(year, month));
              const hideCount =
                count === 0 && isFutureMonth(year, month, currentDate);
              return (
                <li key={label}>
                  <button
                    type="button"
                    css={[monthStyles, isSelected && selectedStyles]}
                    disabled={count === 0}
                    aria-pressed={isSelected}
                    onClick={() =>
                      onChangeSelection(toggleMonth(selection, year, month))
                    }
                  >
                    <span css={labelStyles}>{label}</span>
                    {hideCount ? null : (
                      <span css={countStyles}>{formatCount(count)}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <div css={footerStyles}>
            <button
              type="button"
              css={[rowStyles, isYearSelected && selectedStyles]}
              disabled={yearTotal === 0}
              aria-pressed={isYearSelected}
              onClick={() => onChangeSelection(toggleYear(selection, year))}
            >
              <span css={footerLabelStyles}>All of {year}</span>
              <span css={countStyles}>{formatCount(yearTotal)}</span>
            </button>
          </div>
        </>
      )}
    </FilterDropdown>
  );
};

export default EventMonthFilter;
