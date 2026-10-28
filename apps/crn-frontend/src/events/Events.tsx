import { EventsPage } from '@asap-hub/react-components';
import { events } from '@asap-hub/routing';
import { FC, lazy, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import {
  Frame,
  getEventListOptions,
  SearchFrame,
} from '@asap-hub/frontend-utils';

import { useSearch } from '../hooks';
import Event from './Event';
import { useEventMonthCounts } from './state';

const loadCalendars = () =>
  import(/* webpackChunkName: "events-calendars" */ './calendar/Calendars');
const loadEventList = () =>
  import(/* webpackChunkName: "events-list" */ './EventList');

const Calendars = lazy(loadCalendars);
const EventList = lazy(loadEventList);

const Events: FC<Record<string, never>> = () => {
  const { pathname } = useLocation();
  const [currentTime] = useState(new Date());

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadCalendars().then(loadEventList);
  }, []);

  const {
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    filters,
    setFilters,
  } = useSearch();

  const monthCounts = useEventMonthCounts({
    options: getEventListOptions(currentTime, {
      past: true,
      searchQuery: debouncedSearchQuery,
    }),
    enabled: pathname === events({}).past({}).$,
  });

  return (
    <Routes key={pathname}>
      <Route
        path={events({}).calendar.template}
        element={
          <EventsPage>
            <Frame title="Subscribe to Calendars">
              <Calendars currentTime={currentTime} />
            </Frame>
          </EventsPage>
        }
      />
      <Route
        path={events({}).upcoming.template}
        element={
          <EventsPage
            searchQuery={searchQuery}
            onChangeSearchQuery={setSearchQuery}
          >
            <SearchFrame title="Upcoming Events">
              <EventList
                currentTime={currentTime}
                searchQuery={debouncedSearchQuery}
              />
            </SearchFrame>
          </EventsPage>
        }
      />
      <Route
        path={events({}).past.template}
        element={
          <EventsPage
            searchQuery={searchQuery}
            onChangeSearchQuery={setSearchQuery}
            monthCounts={monthCounts}
            monthFilter={filters}
            onChangeMonthFilter={(newFilters) => setFilters([...newFilters])}
          >
            <SearchFrame title="Past Events">
              <EventList
                past
                currentTime={currentTime}
                searchQuery={debouncedSearchQuery}
                filters={filters}
              />
            </SearchFrame>
          </EventsPage>
        }
      />
      <Route
        path={`${events({}).event.template}/*`}
        element={
          <Frame title="Event">
            <Event />
          </Frame>
        }
      />
      <Route
        index
        element={<Navigate to={events({}).upcoming({}).$} replace />}
      />
    </Routes>
  );
};

export default Events;
