/** @jsxImportSource @emotion/react */
import { ComponentProps, ReactNode } from 'react';
import { css } from '@emotion/react';
import { BasicEvent, EventResponse, gp2 } from '@asap-hub/model';
import formatDistance from 'date-fns/formatDistance';

import type { EmotionJSX } from '@emotion/react/types/jsx-namespace';
import { EventInfo, BackLink } from '../molecules';
import { Card, Paragraph } from '../atoms';
import { rem, tabletScreen } from '../pixels';
import {
  EventMaterials,
  JoinEvent,
  EventAbout,
  CalendarList,
  RelatedResearchCard,
  RelatedTutorialsCard,
  EventSupport,
} from '../organisms';
import { useScrollToHash } from '../routing';

const cardsStyles = css({
  display: 'grid',
  rowGap: rem(33),
  marginBottom: rem(24),
});
const updatedParagraphStyles = css({
  display: 'flex',
  [`@media (min-width: ${tabletScreen.width}px)`]: {
    justifyContent: 'end',
  },
});

type EventPageProps<
  T extends
    | EventResponse['relatedResearch']
    | gp2.OutputResponse['relatedOutputs'],
> = ComponentProps<typeof EventInfo> &
  ComponentProps<typeof JoinEvent> &
  Omit<ComponentProps<typeof EventAbout>, 'variant'> &
  Pick<
    ComponentProps<typeof RelatedResearchCard>,
    'getSourceIcon' | 'tableTitles'
  > &
  Pick<
    BasicEvent,
    | 'lastModifiedDate'
    | 'notes'
    | 'videoRecording'
    | 'presentation'
    | 'meetingMaterials'
    | 'hideMeetingLink'
    | 'calendar'
  > &
  Pick<EventResponse, 'relatedTutorials'> & {
    readonly relatedResearch?: T;
    readonly backHref?: string;
    readonly displayCalendar: boolean;
    readonly eventConversation?: ReactNode;
    readonly titleOutputs?: string;
    readonly descriptionOutput?: string;
    readonly getIconForDocumentType: (
      documentType: T[number]['documentType'],
    ) => EmotionJSX.Element;
    readonly hasFinished?: boolean;
    readonly children?: ReactNode;
  };
const EventPage = <
  T extends
    | EventResponse['relatedResearch']
    | gp2.OutputResponse['relatedOutputs'],
>({
  hasFinished,
  backHref,
  lastModifiedDate,
  calendar,
  hideMeetingLink,
  eventConversation,
  displayCalendar,
  children,
  relatedTutorials,
  relatedResearch,
  titleOutputs,
  descriptionOutput,
  getIconForDocumentType,
  getSourceIcon,
  tableTitles,
  ...props
}: EventPageProps<T>) => {
  useScrollToHash();

  return (
    <div css={({ components }) => [components?.EventPage?.containerStyles]}>
      {backHref && <BackLink href={backHref} />}
      <div css={cardsStyles}>
        <Card>
          <EventInfo {...props} titleLimit={null} tags={[]} />
          <Paragraph accent="lead" styles={updatedParagraphStyles}>
            <small>
              Last updated:{' '}
              {formatDistance(new Date(), new Date(lastModifiedDate))} ago
            </small>
          </Paragraph>
          {children}
          {!hideMeetingLink && <JoinEvent {...props} />}
          <EventAbout {...props} />
        </Card>
        {relatedResearch && relatedResearch?.length > 0 && (
          <RelatedResearchCard
            title={titleOutputs}
            description={descriptionOutput || 'Find all related research.'}
            relatedResearch={relatedResearch}
            getIconForDocumentType={getIconForDocumentType}
            getSourceIcon={getSourceIcon}
            tableTitles={tableTitles}
          />
        )}
        {relatedTutorials && relatedTutorials.length > 0 && (
          <RelatedTutorialsCard
            relatedTutorials={relatedTutorials}
            truncateFrom={3}
          />
        )}
        <EventMaterials {...props} />
        {eventConversation}
        {displayCalendar && (
          <CalendarList
            calendars={[calendar]}
            title="Subscribe to this event's Calendar"
            hideSupportText
          />
        )}
        {!hasFinished && <EventSupport />}
      </div>
    </div>
  );
};

export default EventPage;
