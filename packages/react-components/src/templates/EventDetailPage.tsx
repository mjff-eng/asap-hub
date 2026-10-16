/** @jsxImportSource @emotion/react */
import { ComponentProps, ReactNode } from 'react';
import { css } from '@emotion/react';
import { EventResponse } from '@asap-hub/model';

import type { EmotionJSX } from '@emotion/react/types/jsx-namespace';
import { BackLink, TabNav } from '../molecules';
import { Card, TabLink } from '../atoms';
import { rem } from '../pixels';
import {
  EventCard,
  EventMaterials,
  EventAbout,
  CalendarList,
  RelatedResearchCard,
  RelatedTutorialsCard,
  EventSupport,
} from '../organisms';
import { useScrollToHash } from '../routing';
import { useDateHasPassed } from '../date';
import { considerEndedAfter, noop, useMeetingLinkRefresh } from '../utils';
import { colour } from '../colors';
import PageConstraints from './PageConstraints';

const cardsStyles = css({
  display: 'grid',
  rowGap: rem(33),
  marginBottom: rem(24),
});

const heroBandStyles = css({
  background: colour.background.primary,
  boxShadow: `0 2px 4px -2px ${colour.neutral[100]}`,
});

const heroContentStyles = css({
  display: 'flex',
  flexDirection: 'column',
  paddingTop: rem(12),
});

const backLinkContainerStyles = css({
  marginBottom: rem(56),
});

const eventCardContainerStyles = css({
  marginBottom: rem(40),
});

export type EventDetailTab = 'about' | 'meeting-materials';

type EventDetailPageProps = ComponentProps<typeof EventCard> &
  Omit<ComponentProps<typeof EventAbout>, 'variant'> &
  Pick<
    ComponentProps<typeof RelatedResearchCard>,
    'getSourceIcon' | 'tableTitles'
  > &
  Pick<EventResponse, 'calendar' | 'relatedTutorials'> & {
    readonly relatedResearch?: EventResponse['relatedResearch'];
    readonly backHref?: string;
    readonly displayCalendar: boolean;
    readonly eventConversation?: ReactNode;
    readonly eventAttendance?: ReactNode;
    readonly eventSpeakers?: ReactNode;
    readonly getIconForDocumentType: (
      documentType: EventResponse['relatedResearch'][number]['documentType'],
    ) => EmotionJSX.Element;
    readonly hasFinished?: boolean;
    readonly onRefresh?: () => void;
    readonly children?: ReactNode;
    readonly aboutHref: string;
    readonly meetingMaterialsHref: string;
    readonly selectedTab: EventDetailTab;
  };
const EventDetailPage = ({
  hasFinished,
  backHref,
  calendar,
  eventConversation,
  eventAttendance,
  eventSpeakers,
  displayCalendar,
  children,
  relatedTutorials,
  relatedResearch,
  getIconForDocumentType,
  getSourceIcon,
  tableTitles,
  aboutHref,
  meetingMaterialsHref,
  selectedTab,
  onRefresh = noop,
  ...props
}: EventDetailPageProps) => {
  useScrollToHash();
  useMeetingLinkRefresh({
    meetingLink: props.meetingLink,
    hideMeetingLink: props.hideMeetingLink,
    startDate: props.startDate,
    endDate: props.endDate,
    onRefresh,
  });
  const hasEnded = useDateHasPassed(considerEndedAfter(props.endDate));
  const finished = hasFinished ?? hasEnded;
  const isMeetingMaterialsTab = selectedTab === 'meeting-materials';

  return (
    <article>
      <PageConstraints
        unconstrainedStyles={heroBandStyles}
        noPaddingTop
        noPaddingBottom
      >
        <div css={heroContentStyles}>
          {backHref && (
            <div css={backLinkContainerStyles}>
              <BackLink href={backHref} noPadding />
            </div>
          )}
          <div css={eventCardContainerStyles}>
            <EventCard {...props} titleLimit={null} titleAsLink={false} />
          </div>
          {finished && (
            <TabNav>
              <TabLink href={aboutHref}>About</TabLink>
              <TabLink href={meetingMaterialsHref}>Meeting Materials</TabLink>
            </TabNav>
          )}
        </div>
      </PageConstraints>
      <PageConstraints as="main">
        <div css={cardsStyles}>
          {isMeetingMaterialsTab ? (
            <EventMaterials {...props} />
          ) : (
            <>
              {(props.description || props.tags.length > 0) && (
                <Card>
                  <EventAbout {...props} variant="expandable" />
                </Card>
              )}
              {eventSpeakers}
              {eventAttendance}
              {children && <Card>{children}</Card>}
              <RelatedResearchCard
                description="Find all shared research outputs related to this event."
                relatedResearch={relatedResearch ?? []}
                getIconForDocumentType={getIconForDocumentType}
                getSourceIcon={getSourceIcon}
                tableTitles={tableTitles}
              />
              <RelatedTutorialsCard
                description="Find all tutorials related to this event."
                relatedTutorials={relatedTutorials ?? []}
                truncateFrom={3}
              />
              {eventConversation}
              {displayCalendar && (
                <CalendarList
                  calendars={[calendar]}
                  title="Subscribe to this event's Calendar"
                  hideSupportText
                />
              )}
              <EventSupport />
            </>
          )}
        </div>
      </PageConstraints>
    </article>
  );
};

export default EventDetailPage;
