import { ComponentProps, FC } from 'react';
import { DashboardPageBody } from '@asap-hub/react-components';

import { useGuidesByCollection } from '../guides/state';

import LazySection from './LazySection';
import EventsSection from './sections/EventsSection';
import RecentSharedResearchSection from './sections/RecentSharedResearchSection';
import LatestUsersSection from './sections/LatestUsersSection';

type BodyProps = Omit<
  ComponentProps<typeof DashboardPageBody>,
  'guides' | 'dynamicSections'
> & {
  date: Date;
};

const Body: FC<BodyProps> = ({ date, ...props }) => {
  const guides = useGuidesByCollection('Home');

  return (
    <DashboardPageBody
      {...props}
      guides={guides ? guides.items : []}
      dynamicSections={
        <>
          <LazySection>
            <EventsSection date={date} />
          </LazySection>
          <LazySection>
            <RecentSharedResearchSection />
          </LazySection>
          <LazySection>
            <LatestUsersSection />
          </LazySection>
        </>
      }
    />
  );
};

export default Body;
