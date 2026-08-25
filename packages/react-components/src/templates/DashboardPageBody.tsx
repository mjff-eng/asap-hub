import { ComponentProps, ReactNode } from 'react';
import { css } from '@emotion/react';
import { news as newsRoute, dashboard } from '@asap-hub/routing';
import {
  TeamRole,
  UserResponse,
  NewsResponse,
  GuideDataObject,
} from '@asap-hub/model';
import { NewsSection, HelpSection, RemindersCard } from '../organisms';
import { rem } from '../pixels';
import { Link, Headline2, Card, Paragraph, Icon } from '../atoms';
import { neutral900 } from '..';
import { Accordion } from '../molecules';
import { ExternalLinkIcon } from '../icons';
import { isInternalLink } from '../utils';

const styles = css({
  display: 'grid',
  gridRowGap: rem(56),
});

const infoStyles = css({
  color: neutral900.rgb,
  padding: `${rem(3)} 0 ${rem(24)}`,
  lineHeight: rem(24),
});

const viewAllStyles = css({
  marginTop: rem(24),
  textAlign: 'right',
});

type DashboardPageBodyProps = Pick<
  ComponentProps<typeof RemindersCard>,
  'reminders'
> & {
  announcements: ComponentProps<typeof RemindersCard>['reminders'];
} & Pick<ComponentProps<typeof RemindersCard>, 'reminders'> &
  Omit<ComponentProps<typeof NewsSection>, 'title' | 'type' | 'news'> & {
    readonly userId: string;
    readonly teamId?: string;
    readonly news: ReadonlyArray<NewsResponse>;
  } & Pick<UserResponse, 'dismissedGettingStarted'> & {
    roles: TeamRole[];
    guides: GuideDataObject[];
    /** Lazily-loaded sections rendered between Reminders and News. */
    dynamicSections?: ReactNode;
  };

const publishRoles: TeamRole[] = ['ASAP Staff', 'Project Manager'];

const DashboardPageBody: React.FC<DashboardPageBodyProps> = ({
  announcements,
  news,
  roles,
  reminders,
  guides,
  dismissedGettingStarted,
  dynamicSections,
}) => {
  const canPublish = roles.some((role) => publishRoles.includes(role));

  const guideAccordion = guides.map((guide) => ({
    icon: guide.icon ? <Icon url={guide.icon} /> : <></>,
    title: guide.title,
    description: guide.content.map((content) => (
      <div key={content.text}>
        <Paragraph>{content.text}</Paragraph>
        <div css={{ width: 'fit-content' }}>
          {content.linkUrl && (
            <div css={{ width: 'fit-content' }}>
              <Link buttonStyle small primary href={content.linkUrl}>
                {content.linkText}{' '}
                {!isInternalLink(content.linkUrl)[0] && <ExternalLinkIcon />}
              </Link>
            </div>
          )}
        </div>
      </div>
    )),
  }));

  return (
    <div css={styles}>
      {!dismissedGettingStarted && (
        <div>
          <Headline2 styleAsHeading={3}>Get Started with ASAP</Headline2>
          <div css={infoStyles}>
            Here’s everything you need to know to start using the Hub.
          </div>
          <Card accent="neutral200" padding={false}>
            <Accordion
              items={guideAccordion}
              info={{
                href: dashboard({}).dismissGettingStarted({}).$,
                hrefText: 'Don’t Show Again',
                text: 'Want to remove this section?',
              }}
            />
          </Card>
        </div>
      )}
      {announcements.length > 0 && (
        <div>
          <Headline2 styleAsHeading={3}>Announcements</Headline2>
          <div css={infoStyles}>Latest admin announcements.</div>
          <RemindersCard
            reminders={announcements}
            limit={3}
            canPublish={canPublish}
          />
        </div>
      )}
      <div>
        <Headline2 styleAsHeading={3}>Reminders</Headline2>
        <div css={infoStyles}>
          We will remind you of the most important tasks you need to do.
        </div>
        <RemindersCard
          reminders={reminders}
          limit={3}
          canPublish={canPublish}
        />
      </div>
      {dynamicSections}
      {news.length ? (
        <div>
          <NewsSection
            type="News"
            news={news}
            title="Latest News from ASAP"
            subtitle="Explore the latest shared research and learn more about them."
          />
          <p css={viewAllStyles}>
            <Link href={newsRoute({}).$}>View All →</Link>
          </p>
        </div>
      ) : null}
      <HelpSection />
    </div>
  );
};

export default DashboardPageBody;
