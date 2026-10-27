import { events } from '@asap-hub/routing';
import { css } from '@emotion/react';
import { ComponentProps, useState } from 'react';
import { Display, Paragraph, TabLink } from '../atoms';
import { SearchField, TabNav } from '../molecules';
import {
  EventMonthFilter,
  EventMonthFilterSelection,
  EventSearch,
} from '../organisms';
import { rem, smallDesktopScreen } from '../pixels';
import { queryParamString } from '../routing';
import PageConstraints from './PageConstraints';
import PageInfoContainer from './PageInfoContainer';

const textStyles = css({
  maxWidth: rem(smallDesktopScreen.width),
});

const searchRowStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(18),
  '> :first-of-type': { flex: 1 },
});

const yearOf = (month: string) => Number(month.slice(0, 4));

type EventsPageHeaderProps = Omit<
  ComponentProps<typeof EventSearch>,
  'children'
> & {
  monthCounts?: Readonly<Record<string, number>>;
  monthFilter?: EventMonthFilterSelection;
  onChangeMonthFilter?: (selection: EventMonthFilterSelection) => void;
};
const EventsPageHeader: React.FC<EventsPageHeaderProps> = ({
  searchQuery,
  onChangeSearchQuery,
  monthCounts = {},
  monthFilter = new Set(),
  onChangeMonthFilter,
}) => {
  const [year, setYear] = useState(new Date().getFullYear());

  // Events per year, e.g. { 2025: 12, 2026: 27 }
  const yearCounts = Object.entries(monthCounts).reduce<Record<number, number>>(
    (counts, [month, count]) => ({
      ...counts,
      [yearOf(month)]: (counts[yearOf(month)] ?? 0) + count,
    }),
    { [year]: 0 },
  );

  // Events per month in the selected year, by month index, e.g. { 0: 7, 3: 10 }
  const monthCountsInYear = Object.fromEntries(
    Object.entries(monthCounts)
      .filter(([month]) => yearOf(month) === year)
      .map(([month, count]) => [Number(month.slice(5, 7)) - 1, count]),
  );

  return (
    <header>
      <PageInfoContainer
        nav={
          <TabNav>
            <TabLink
              href={events({}).upcoming({}).$ + queryParamString(searchQuery)}
            >
              Upcoming Events
            </TabLink>
            <TabLink
              href={events({}).past({}).$ + queryParamString(searchQuery)}
            >
              Past Events
            </TabLink>
            <TabLink href={events({}).calendar({}).$}>
              Subscribe to Calendars
            </TabLink>
          </TabNav>
        }
      >
        <Display styleAsHeading={2}>Calendar & Events</Display>
        <div css={textStyles}>
          <Paragraph accent="tertiary">
            Find out about upcoming events from ASAP and Groups. You can easily
            add specific calendars to your own Google Calendar to easily stay
            updated.
          </Paragraph>
        </div>
      </PageInfoContainer>

      {searchQuery === undefined ? null : (
        <PageConstraints noPaddingBottom>
          <div role="search" css={searchRowStyles}>
            <SearchField
              placeholder="Search by topic, presenting team, …"
              value={searchQuery}
              onChange={onChangeSearchQuery}
            />
            {onChangeMonthFilter && (
              <EventMonthFilter
                year={year}
                yearCounts={yearCounts}
                monthCounts={monthCountsInYear}
                selection={monthFilter}
                onChangeYear={setYear}
                onChangeSelection={onChangeMonthFilter}
              />
            )}
          </div>
        </PageConstraints>
      )}
    </header>
  );
};

export default EventsPageHeader;
