/** @jsxImportSource @emotion/react */
import { ComponentProps, ReactNode } from 'react';
import { css } from '@emotion/react';
import { BasicCalendarResponse, EventResponse } from '@asap-hub/model';
import { dashboard, events, network, sharedResearch } from '@asap-hub/routing';

import { Breadcrumbs, TabNav } from '../molecules';
import { Card, TabLink } from '../atoms';
import { rem } from '../pixels';
import {
  EventCard,
  EventToast,
  EventMaterials,
  EventAbout,
  EventCalendarCard,
  EventRelatedResearchCard,
  RelatedTutorialsCard,
  EventSupport,
} from '../organisms';
import { useScrollToHash } from '../routing';
import { useDateHasPassed } from '../date';
import { considerEndedAfter, noop, useMeetingLinkRefresh } from '../utils';
import { colour } from '../colors';
import { TeamIcon, WorkingGroupsIcon } from '../icons';
import type { CalendarOwner, EventRelatedResearchItem } from '../organisms';
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

const noBreadcrumbsStyles = css({
  paddingTop: rem(40),
});

const breadcrumbsContainerStyles = css({
  marginBottom: rem(48),
});

const eventCardContainerStyles = css({
  marginBottom: rem(32),
});

const getRelatedResearchSource = ({
  teams,
  workingGroups,
}: EventResponse['relatedResearch'][number]): EventRelatedResearchItem['source'] => {
  if (workingGroups?.length) {
    return {
      title: workingGroups[0].title,
      href: network({})
        .workingGroups({})
        .workingGroup({ workingGroupId: workingGroups[0].id }).$,
      icon: <WorkingGroupsIcon />,
    };
  }
  if (teams.length > 1) {
    return { title: 'Multiple teams', icon: <TeamIcon /> };
  }
  if (teams[0]) {
    return {
      title: teams[0].displayName,
      href: network({}).teams({}).team({ teamId: teams[0].id }).$,
      icon: <TeamIcon />,
    };
  }
  return undefined;
};

const toRelatedResearchItem = (
  output: EventResponse['relatedResearch'][number],
): EventRelatedResearchItem => ({
  id: output.id,
  title: output.title,
  href: sharedResearch({}).researchOutput({ researchOutputId: output.id }).$,
  documentType: output.documentType,
  type: output.type,
  source: getRelatedResearchSource(output),
});

export type EventDetailTab = 'about' | 'meeting-materials';

type EventDetailPageProps = ComponentProps<typeof EventCard> &
  Omit<ComponentProps<typeof EventAbout>, 'variant'> &
  Partial<Pick<EventResponse, 'relatedTutorials'>> & {
    readonly calendar: BasicCalendarResponse;
    readonly relatedResearch?: EventResponse['relatedResearch'];
    readonly relatedResearchCard?: ReactNode;
    readonly displayCalendar: boolean;
    readonly calendarOwner: CalendarOwner;
    readonly hideCalendarInstructions?: boolean;
    readonly heroBanner?: ReactNode;
    readonly hideBreadcrumbs?: boolean;
    readonly plainHero?: boolean;
    readonly hideMaterialsToast?: boolean;
    readonly toastAboveBanner?: boolean;
    readonly eventConversation?: ReactNode;
    readonly eventAttendance?: ReactNode;
    readonly eventSpeakers?: ReactNode;
    readonly hasFinished?: boolean;
    readonly onRefresh?: () => void;
    readonly children?: ReactNode;
    readonly aboutHref: string;
    readonly meetingMaterialsHref: string;
    readonly selectedTab: EventDetailTab;
  };
const EventDetailPage = ({
  hasFinished,
  calendar,
  eventConversation,
  eventAttendance,
  eventSpeakers,
  displayCalendar,
  calendarOwner,
  hideCalendarInstructions,
  heroBanner,
  hideBreadcrumbs = false,
  plainHero = false,
  hideMaterialsToast = false,
  toastAboveBanner = false,
  children,
  relatedTutorials,
  relatedResearch,
  relatedResearchCard,
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
      {toastAboveBanner && (
        <EventToast
          {...props}
          displayMaterialsToast={!hideMaterialsToast}
          joinMeetingTooltipPosition="bottom"
        />
      )}
      {heroBanner}
      <PageConstraints
        unconstrainedStyles={heroBandStyles}
        noPaddingTop
        noPaddingBottom
      >
        <div css={[heroContentStyles, hideBreadcrumbs && noBreadcrumbsStyles]}>
          {!hideBreadcrumbs && (
            <div css={breadcrumbsContainerStyles}>
              <Breadcrumbs
                homeHref={dashboard({}).$}
                items={[
                  { label: 'Calendar & Events', href: events({}).$ },
                  { label: props.title },
                ]}
              />
            </div>
          )}
          <div css={eventCardContainerStyles}>
            <EventCard
              {...props}
              titleLimit={null}
              titleAsLink={false}
              hideTags
              titleStyleAsHeading={4}
              plain={plainHero}
              displayToast={!toastAboveBanner}
              displayMaterialsToast={!hideMaterialsToast}
              joinMeetingTooltipPosition="bottom"
            />
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
              {relatedResearchCard ?? (
                <EventRelatedResearchCard
                  relatedResearch={(relatedResearch ?? []).map(
                    toRelatedResearchItem,
                  )}
                />
              )}
              {relatedTutorials && (
                <RelatedTutorialsCard
                  description="Find all tutorials related to this event."
                  relatedTutorials={relatedTutorials}
                  truncateFrom={3}
                />
              )}
              {eventConversation}
              {displayCalendar && (
                <EventCalendarCard
                  calendarId={calendar.id}
                  owner={calendarOwner}
                />
              )}
              <EventSupport
                hideCalendarInstructions={hideCalendarInstructions}
              />
            </>
          )}
        </div>
      </PageConstraints>
    </article>
  );
};

export default EventDetailPage;
