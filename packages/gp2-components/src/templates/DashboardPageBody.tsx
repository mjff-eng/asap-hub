import { gp2 as gp2Model } from '@asap-hub/model';
import { gp2 as gp2Routes } from '@asap-hub/routing';
import {
  Accordion,
  Button,
  Card,
  DashboardUpcomingEvents,
  EventCard,
  Headline2,
  LabIcon,
  WorkingGroupsIcon,
  Link,
  Paragraph,
  pixels,
  RemindersCard,
  PastEventsDashboardCard,
  RecentSharedOutputs,
  NewsCard,
  neutral1000,
  neutral900,
} from '@asap-hub/react-components';
import { css } from '@emotion/react';
import { ComponentProps } from 'react';
import { useNavigate } from 'react-router';
import { ArticleIcon } from '../icons';
import { mobileQuery } from '../layout';
import GuideDescription from '../molecules/GuideDescription';
import InfoCard from '../molecules/InfoCard';
import { DashboardUserCard } from '../organisms';
import { getIconForDocumentType } from '../utils';

const { rem } = pixels;
const infoStyles = css({
  color: neutral900.rgb,
  padding: `${rem(3)} 0 ${rem(24)}`,
  lineHeight: rem(24),
});

const viewAllStyles = css({
  marginTop: rem(24),
  textAlign: 'center',
});

const columnContainer = css({
  display: 'grid',
  gridTemplateColumns: '1fr',
});

const tutorialsCardStyles = css({ padding: `0 ${rem(24)}` });

const contentCardsStyles = css({
  display: 'flex',
  gap: rem(24),
  width: '100%',
  justifyContent: 'center',
  justifyItems: 'center',
  marginTop: rem(32),
  [mobileQuery]: {
    flexDirection: 'column',
  },
});

const usersCardsStyles = css({
  display: 'flex',
  gap: rem(15),
  width: '100%',
  justifyContent: 'center',
  justifyItems: 'center',
  marginTop: rem(24),
  [mobileQuery]: {
    flexDirection: 'column',
  },
});

type DashboardPageBodyProps = {
  canPublish: boolean;
  news: gp2Model.ListNewsResponse;
  latestStats: gp2Model.StatsDataObject;
  totalOfUpcomingEvents: number;
  totalOfPastEvents: number;
  announcements: ComponentProps<typeof RemindersCard>['reminders'];
  reminders: ComponentProps<typeof RemindersCard>['reminders'];
  upcomingEvents: ComponentProps<typeof EventCard>[];
  pastEvents: ComponentProps<typeof PastEventsDashboardCard>['events'];
  guides?: gp2Model.GuideDataObject[];
  recentOutputs: gp2Model.OutputBaseResponse[];
  totalOutputs: number;
  latestUsers: gp2Model.UserResponse[];
};

const DashboardPageBody: React.FC<DashboardPageBodyProps> = ({
  canPublish,
  news,
  latestStats,
  totalOfUpcomingEvents,
  totalOfPastEvents,
  announcements,
  reminders,
  upcomingEvents,
  pastEvents,
  guides,
  latestUsers,
  recentOutputs,
  totalOutputs,
}) => {
  const navigate = useNavigate();
  const latestNews = news.items[0];
  return (
    <>
      {announcements.length > 0 ? (
        <div css={columnContainer}>
          <Headline2>Announcements</Headline2>
          <Paragraph accent="neutral900" noMargin>
            Latest admin announcements.
          </Paragraph>
          <div css={contentCardsStyles}>
            <RemindersCard limit={3} reminders={announcements} canPublish />
          </div>
        </div>
      ) : null}

      <div css={columnContainer}>
        <Headline2>Reminders</Headline2>
        <Paragraph accent="neutral900" noMargin>
          Latest reminders about published outputs and upcoming events.
        </Paragraph>
        <div css={contentCardsStyles}>
          <RemindersCard
            limit={3}
            reminders={reminders}
            canPublish={canPublish}
          />
        </div>
      </div>
      <div css={columnContainer}>
        <Headline2>GP2 Hub Stats</Headline2>
        <Paragraph accent="neutral900" noMargin>
          Here are the latest stats from the GP2 Hub.
        </Paragraph>
        <div css={contentCardsStyles}>
          <InfoCard
            icon={<LabIcon color={neutral1000.hex} size={40} />}
            title="Samples Processed & Shared"
            total={latestStats.sampleCount}
          />
          <InfoCard
            icon={
              <WorkingGroupsIcon
                color={neutral1000.hex}
                width={40}
                height={40}
              />
            }
            title="Cohorts Pledged"
            total={latestStats.cohortCount}
          />
          <InfoCard
            icon={<ArticleIcon color={neutral1000.hex} size={40} />}
            title="Research Articles"
            total={latestStats.articleCount}
          />
        </div>
      </div>
      {guides && (
        <div css={columnContainer}>
          <Headline2>Tools and Tutorials</Headline2>
          <Paragraph accent="neutral900" noMargin>
            Here are some quick links to GP2 Hub resources.
          </Paragraph>
          <div css={contentCardsStyles}>
            <Card padding={false}>
              <div css={tutorialsCardStyles}>
                <Accordion
                  items={guides.map((guide: gp2Model.GuideDataObject) => ({
                    title: guide.title,
                    icon: (
                      <img
                        src={guide.icon}
                        alt={guide.title}
                        style={{ verticalAlign: 'middle' }}
                      />
                    ),
                    description: (
                      <GuideDescription blocks={guide.description} />
                    ),
                  }))}
                />
              </div>
            </Card>
          </div>
        </div>
      )}
      <div css={columnContainer}>
        <Headline2 styleAsHeading={3}>Upcoming Events</Headline2>
        <div css={infoStyles}>
          Here are some of the upcoming GP2 Hub events.
        </div>
        <DashboardUpcomingEvents upcomingEvents={upcomingEvents} />
        {totalOfUpcomingEvents > 3 && (
          <p css={viewAllStyles}>
            <Button
              data-testid="view-upcoming-events"
              onClick={() => navigate(gp2Routes.events({}).upcoming({}).$)}
            >
              View All
            </Button>
          </p>
        )}
      </div>
      <div css={columnContainer}>
        <Headline2 styleAsHeading={3}>Past Events</Headline2>
        <div css={infoStyles}>
          Explore previous events and learn about what was discussed.
        </div>
        <PastEventsDashboardCard events={pastEvents} />
        {totalOfPastEvents > 3 && (
          <p css={viewAllStyles}>
            <Button
              data-testid="view-past-events"
              onClick={() => navigate(gp2Routes.events({}).past({}).$)}
            >
              View All
            </Button>
          </p>
        )}
      </div>
      <div>
        <Headline2 styleAsHeading={3}>Recent Outputs</Headline2>
        <div css={infoStyles}>
          Explore the latest outputs and learn more about them.
        </div>
        <RecentSharedOutputs<gp2Model.OutputResponse['relatedOutputs']>
          outputs={recentOutputs}
          getIconForDocumentType={getIconForDocumentType}
          getSharedOutputHref={(id: string) =>
            gp2Routes.outputs({}).output({ outputId: id }).$
          }
          tableTitles={['Output', 'Type of Output', 'Date']}
        />
        {totalOutputs > 5 && (
          <p css={viewAllStyles}>
            <Button
              data-testid="view-outputs"
              onClick={() => navigate(gp2Routes.outputs({}).$)}
            >
              View All
            </Button>
          </p>
        )}
      </div>
      <div css={columnContainer}>
        <Headline2>Latest Users</Headline2>
        <Paragraph accent="neutral900" noMargin>
          Explore and learn more about the latest users on the hub.
        </Paragraph>
        <div css={usersCardsStyles}>
          {latestUsers?.map((user) => (
            <DashboardUserCard
              user={user}
              key={`${user.id}-${user.displayName}`}
            />
          ))}
        </div>

        <p css={viewAllStyles}>
          <Button
            data-testid="view-users"
            onClick={() => navigate(gp2Routes.users({}).$)}
          >
            View All
          </Button>
        </p>
      </div>
      {latestNews ? (
        <div css={columnContainer}>
          <Headline2>Latest News</Headline2>
          <Paragraph accent="neutral900" noMargin>
            Here is the latest GP2 news.
          </Paragraph>
          <div css={[contentCardsStyles, columnContainer, { gap: rem(32) }]}>
            <NewsCard {...latestNews} key={latestNews.id} type="News" />
            <Link buttonStyle noMargin href={gp2Routes.newsList({}).$}>
              View All
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
};
export default DashboardPageBody;
