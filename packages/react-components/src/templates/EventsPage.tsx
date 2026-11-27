import { ComponentProps } from 'react';

import EventsPageHeader from './EventsPageHeader';
import PageConstraints from './PageConstraints';

type EventsPageProps = ComponentProps<typeof EventsPageHeader> & {
  children?: React.ReactNode;
};

const EventsPage: React.FC<EventsPageProps> = ({ children, ...props }) => (
  <article>
    <EventsPageHeader {...props} />
    <PageConstraints width="content" as="main">
      {children}
    </PageConstraints>
  </article>
);

export default EventsPage;
