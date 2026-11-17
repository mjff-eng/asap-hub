import { createListReminderResponse, gp2 } from '@asap-hub/fixtures';
import { DashboardPageBody } from '@asap-hub/gp2-components';

import { number } from '../knobs';

export default {
  title: 'GP2 / Templates / Dashboard / Dashboard Page Body',
  component: DashboardPageBody,
};

const mockedDashboardStats = {
  articleCount: 31,
  cohortCount: 12,
  sampleCount: 32131,
};

export const Normal = () => (
  <DashboardPageBody
    canPublish={true}
    reminders={createListReminderResponse(number('Reminders', 3)).items}
    news={gp2.createNewsResponse()}
    latestStats={mockedDashboardStats}
    upcomingEvents={gp2.createListEventResponse(3).items.map((event) => ({
      ...event,
      tags: event.tags.map(({ name }) => name),
      eventOwner: <div>GP2 Team</div>,
    }))}
    totalOfUpcomingEvents={3}
    pastEvents={gp2.createListEventResponse(3).items}
    totalOfPastEvents={3}
    latestUsers={gp2.createUsersResponse(3).items}
    recentOutputs={gp2.createListOutputResponse(2).items}
    totalOutputs={2}
    announcements={createListReminderResponse(number('Reminders', 3)).items}
  />
);
