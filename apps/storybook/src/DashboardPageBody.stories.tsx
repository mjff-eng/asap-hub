import { ComponentProps } from 'react';
import {
  DashboardPageBody,
  DashboardSection,
  DashboardUpcomingEvents,
  PastEventsDashboardCard,
  RecentSharedOutputs,
  DashboardRecommendedUsers,
  getIconForDocumentType,
} from '@asap-hub/react-components';
import { EventResponse } from '@asap-hub/model';
import {
  createListEventResponse,
  createListReminderResponse,
  createListResearchOutputResponse,
  createListUserResponse,
} from '@asap-hub/fixtures';

import { array, number, text } from './knobs';

export default {
  title: 'Templates / Dashboard / Page Body',
};

const props = (): ComponentProps<typeof DashboardPageBody> => ({
  news: [
    {
      id: 'uuid-1',
      created: new Date().toISOString(),
      title: 'Learn about Protocols.io, an ASAP preferred tool',
      shortText:
        'Discover current and planned tools (e.g., animal & cell models, antibodies, vectors, tissues, etc.) in a sortable table. This will be a living reference.',
      link: text('Link', 'https://example.com'),
      linkText: text('Link Text', 'External Link'),
      tags: array('Tags', [
        'Neurological Diseases',
        'Clinical Neurology',
        'Adult Neurology',
        'Neuroimaging',
      ]),
    },
    {
      id: 'uuid-2',
      created: new Date().toISOString(),
      title:
        'Welcome to the ASAP Collaborative Initiative: The Science & the scientists',
      tags: array('Tags', [
        'Neurological Diseases',
        'Clinical Neurology',
        'Adult Neurology',
        'Neuroimaging',
      ]),
    },
  ],
  userId: 'u42',
  teamId: 't42',
  roles: [],
  reminders: createListReminderResponse(number('Reminders', 3)).items,
  announcements: createListReminderResponse(number('Reminders', 3)).items,
  guides: [],
});

// In the app these are lazily mounted and self-fetching; the story renders
// them eagerly with fixture data.
const dynamicSections = () => {
  const upcomingEvents = createListEventResponse(
    number('Number of events', 4),
  ).items.map((event) => ({
    ...event,
    eventOwner: <div>ASAP Team</div>,
    tags: event.tags.map((tag) => tag.name),
  }));
  const recentSharedOutputs = createListResearchOutputResponse(
    number('Number of outputs', 5),
  );

  return (
    <>
      <DashboardSection
        title="Upcoming Events"
        description="Here are some upcoming events."
        viewAllHref={upcomingEvents.length > 3 ? '/events/upcoming' : undefined}
        viewAllTestId="view-upcoming-events"
      >
        <DashboardUpcomingEvents upcomingEvents={upcomingEvents} />
      </DashboardSection>
      <DashboardSection
        title="Past Events"
        description="Explore previous events and learn about what was discussed."
        viewAllHref="/events/past"
        viewAllTestId="view-past-events"
      >
        <PastEventsDashboardCard events={createListEventResponse(3).items} />
      </DashboardSection>
      <DashboardSection
        title="Recent Shared Research"
        description="Explore and learn more about the latest Shared Research."
        viewAllHref={
          recentSharedOutputs.total > 5 ? '/shared-research' : undefined
        }
        viewAllTestId="view-recent-shared-outputs"
      >
        <RecentSharedOutputs<EventResponse['relatedResearch']>
          getIconForDocumentType={getIconForDocumentType}
          outputs={recentSharedOutputs.items}
        />
      </DashboardSection>
      <DashboardSection
        title="Latest Users"
        description="Explore and learn more about the latest users on the hub."
        viewAllHref="/network/users"
      >
        <DashboardRecommendedUsers
          recommendedUsers={createListUserResponse(3).items}
        />
      </DashboardSection>
    </>
  );
};

export const Normal = () => (
  <DashboardPageBody {...props()} dynamicSections={dynamicSections()} />
);
