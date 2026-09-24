import { ComponentProps } from 'react';
import { css } from '@emotion/react';
import formatDistance from 'date-fns/formatDistance';
import { dashboard, network } from '@asap-hub/routing';
import { InterestGroupResponse, InterestGroupTools } from '@asap-hub/model';

import { neutral900 } from '../colors';
import { mobileScreen, rem, tabletScreen } from '../pixels';
import { CopyButton, Display, Link, StateTag, TabLink } from '../atoms';
import {
  googleDriveIcon,
  InactiveBadgeIcon,
  systemCalendarIcon,
  TeamIcon,
} from '../icons';
import { Breadcrumbs, CalendarLink, TabNav } from '../molecules';
import { EventSearch } from '../organisms';
import { queryParamString } from '../routing';
import { createMailTo } from '../mail';
import PageInfoContainer from './PageInfoContainer';
import PageConstraints from './PageConstraints';

const belowHeadlineStyles = css({
  display: 'flex',
  justifyContent: 'space-between',
  flexFlow: 'column',
  [`@media (min-width: ${tabletScreen.width}px)`]: {
    flexFlow: 'row',
    flexWrap: 'wrap',
  },
});

const titleStyle = css({
  display: 'flex',
  flexFlow: 'row',
  gap: rem(15),
  alignItems: 'center',
  [`@media (max-width: ${tabletScreen.width - 1}px)`]: {
    flexFlow: 'column',
    gap: 3,
    alignItems: 'flex-start',
  },
});

const contactStyles = css({
  display: 'flex',
  flexFlow: 'row',
  gap: rem(8),
  margin: `${rem(12)} 0`,
});

const buttonStyles = css({
  [`@media (max-width: ${tabletScreen.min - 1}px)`]: {
    display: 'flex',
    flexGrow: 1,
  },
});

const toolsStyles = css({
  display: 'flex',
  gap: rem(12),
  [`@media (max-width: ${mobileScreen.max - 1}px)`]: {
    flexFlow: 'column',
    gap: 0,
  },
});

type InterestGroupProfileHeaderProps = {
  readonly id: string;
  readonly name: string;
  readonly numberOfTeams: number;
  readonly lastModifiedDate: string;
  readonly groupTeamsHref: string;
  readonly active: boolean;
  readonly upcomingEventsCount: number;
  readonly pastEventsCount: number;
  readonly tools: InterestGroupTools;
  readonly calendarId?: InterestGroupResponse['calendars'][0]['id'];
  readonly contactEmails: string[];
} & ComponentProps<typeof EventSearch>;
const InterestGroupProfileHeader: React.FC<InterestGroupProfileHeaderProps> = ({
  id,
  active,
  name,
  numberOfTeams,
  lastModifiedDate,
  groupTeamsHref,
  searchQuery,
  onChangeSearchQuery,
  upcomingEventsCount,
  pastEventsCount,
  tools,
  calendarId,
  contactEmails,
}) => {
  const route = network({})
    .interestGroups({})
    .interestGroup({ interestGroupId: id });

  return (
    <header>
      <PageInfoContainer
        breadcrumbs={
          <Breadcrumbs
            homeHref={dashboard({}).$}
            items={[
              {
                label: 'Interest Groups',
                href: network({}).interestGroups({}).$,
              },
              { label: name },
            ]}
          />
        }
        nav={
          <TabNav>
            <TabLink href={route.about({}).$}>About</TabLink>
            {active && <TabLink href={route.calendar({}).$}>Calendar</TabLink>}
            {active && (
              <TabLink
                href={route.upcoming({}).$ + queryParamString(searchQuery)}
              >
                Upcoming Events ({upcomingEventsCount})
              </TabLink>
            )}

            <TabLink href={route.past({}).$ + queryParamString(searchQuery)}>
              Past Events ({pastEventsCount})
            </TabLink>
          </TabNav>
        }
      >
        <div css={titleStyle}>
          <Display styleAsHeading={2}>{name}</Display>
          {!active && (
            <StateTag
              icon={<InactiveBadgeIcon entityName="Interest Group" />}
              label="Inactive"
            />
          )}
        </div>
        {active && contactEmails.length !== 0 && (
          <div css={contactStyles}>
            <span css={buttonStyles}>
              <Link
                buttonStyle
                small
                primary
                href={`${createMailTo(contactEmails)}`}
                noMargin
              >
                Contact
              </Link>
            </span>
            <CopyButton
              hoverTooltipText="Copy Email"
              clickTooltipText="Email Copied"
              onClick={() =>
                navigator.clipboard.writeText(contactEmails.join())
              }
            />
          </div>
        )}
        <div css={[belowHeadlineStyles]}>
          <div css={toolsStyles}>
            {tools.googleDrive && (
              <Link href={tools.googleDrive} buttonStyle small>
                {googleDriveIcon} Access Drive
              </Link>
            )}
            {calendarId && active && (
              <CalendarLink id={calendarId}>
                <span css={{ display: 'flex', gap: '8px' }}>
                  {systemCalendarIcon}Subscribe
                </span>
              </CalendarLink>
            )}
            {active && (
              <div css={{ display: 'flex' }}>
                <div
                  css={{
                    paddingRight: rem(15),
                    paddingTop: rem(20),
                    marginLeft: rem(4),
                    display: 'grid',
                  }}
                >
                  <TeamIcon />
                </div>
                <div
                  css={{
                    flexGrow: 1,
                    paddingRight: rem(30),
                    paddingTop: rem(20),
                  }}
                >
                  <Link href={groupTeamsHref}>
                    {numberOfTeams} Team{numberOfTeams === 1 ? '' : 's'}
                  </Link>
                </div>
              </div>
            )}
          </div>
          <div
            css={{
              paddingTop: `${20 / 13.6}em`,
              fontSize: rem(13.6),
              color: neutral900.rgb,
            }}
          >
            Last updated:{' '}
            {formatDistance(new Date(), new Date(lastModifiedDate))} ago
          </div>
        </div>
      </PageInfoContainer>
      {!!searchQuery && (
        <PageConstraints noPaddingBottom>
          <EventSearch
            searchQuery={searchQuery}
            onChangeSearchQuery={onChangeSearchQuery}
          />
        </PageConstraints>
      )}
    </header>
  );
};

export default InterestGroupProfileHeader;
