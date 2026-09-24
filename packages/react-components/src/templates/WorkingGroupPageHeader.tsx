import { css } from '@emotion/react';
import { formatDistance } from 'date-fns';
import { ResearchOutputPermissionsContext } from '@asap-hub/react-context';
import { WorkingGroupResponse } from '@asap-hub/model';
import { dashboard, network } from '@asap-hub/routing';
import { useContext } from 'react';

import { mobileScreen, rem, smallDesktopScreen } from '../pixels';
import {
  Link,
  Display,
  StateTag,
  TabLink,
  Caption,
  CopyButton,
} from '../atoms';
import { colour } from '../colors';
import {
  Breadcrumbs,
  UserAvatarList,
  TabNav,
  DropdownButton,
  CalendarLink,
} from '../molecules';
import {
  article,
  bioinformatics,
  dataset,
  labMaterial,
  plusIcon,
  protocol,
  successIcon,
  crnReportIcon,
  googleDriveIcon,
  systemCalendarIcon,
} from '../icons';
import { createMailTo } from '../mail';
import PageInfoContainer from './PageInfoContainer';

const titleStyle = css({
  display: 'flex',
  flexFlow: 'column',
  gap: rem(3),
  alignItems: 'flex-start',
  paddingBottom: rem(12),
  maxWidth: rem(smallDesktopScreen.width),
});

const rowStyles = css({
  display: 'flex',
  flexFlow: 'column',
  [`@media (min-width: ${mobileScreen.max}px)`]: {
    flexFlow: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: rem(16),
  },
});

const toolsStyles = css({
  display: 'flex',
  flexFlow: 'column',
  gap: rem(12),
  [`@media (min-width: ${mobileScreen.max}px)`]: {
    flexFlow: 'row',
    justifyContent: 'space-between',
  },
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    '> a': {
      marginBottom: 0,
    },
    gap: 0,
  },
});

const lastUpdatedStyles = css({
  alignSelf: 'center',
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    marginRight: 'auto',
  },
});

const contactSectionStyles = css({
  alignItems: 'center',

  display: 'grid',
  gridColumnGap: rem(16),

  grid: `
    "members" auto
    "lab"     auto
    "contact" auto
    "create"  auto
  `,

  [`@media (min-width: ${mobileScreen.max}px)`]: {
    grid: `
      "contact members create"
      "lab lab lab"/ max-content 1fr
    `,
  },
});

const pointOfContactStyles = css({
  gridArea: 'contact',
  display: 'flex',
  gap: rem(8),
  margin: `${rem(12)} 0`,
});

const createStyles = css({
  gridArea: 'create',
  display: 'flex',
  [`@media (min-width: ${mobileScreen.max}px)`]: {
    display: 'block',
  },
});

const dropdownButtonStyling = css({
  display: 'flex',
  columnGap: rem(9),
  svg: {
    color: colour.brand.crn[800],
  },
});

type WorkingGroupPageHeaderProps = {
  readonly membersListElementId: string;
  readonly upcomingEventsCount?: number;
  readonly pastEventsCount?: number;
  readonly workingGroupsOutputsCount?: number;
  readonly workingGroupsDraftOutputsCount?: number;
} & Pick<
  WorkingGroupResponse,
  | 'id'
  | 'title'
  | 'complete'
  | 'lastModifiedDate'
  | 'leaders'
  | 'members'
  | 'externalLink'
  | 'pointOfContact'
  | 'calendars'
>;

const WorkingGroupPageHeader: React.FC<WorkingGroupPageHeaderProps> = ({
  id,
  title,
  complete,
  lastModifiedDate,
  externalLink,
  pointOfContact,
  leaders,
  members,
  membersListElementId,
  workingGroupsOutputsCount = 0,
  workingGroupsDraftOutputsCount,
  upcomingEventsCount,
  pastEventsCount,
  calendars,
}) => {
  const { canShareResearchOutput } = useContext(
    ResearchOutputPermissionsContext,
  );

  const route = network({})
    .workingGroups({})
    .workingGroup({ workingGroupId: id });

  return (
    <header>
      <PageInfoContainer
        breadcrumbs={
          <Breadcrumbs
            homeHref={dashboard({}).$}
            items={[
              {
                label: 'Working Groups',
                href: network({}).workingGroups({}).$,
              },
              { label: title },
            ]}
          />
        }
        nav={
          <TabNav>
            <TabLink
              href={
                network({})
                  .workingGroups({})
                  .workingGroup({ workingGroupId: id })
                  .about({}).$
              }
            >
              About
            </TabLink>
            {!complete && (
              <TabLink href={route.calendar({}).$}>Calendar</TabLink>
            )}
            <TabLink
              href={
                network({})
                  .workingGroups({})
                  .workingGroup({ workingGroupId: id })
                  .outputs({}).$
              }
            >
              Outputs ({workingGroupsOutputsCount})
            </TabLink>
            {workingGroupsDraftOutputsCount !== undefined && (
              <TabLink
                href={
                  network({})
                    .workingGroups({})
                    .workingGroup({ workingGroupId: id })
                    .draftOutputs({}).$
                }
              >
                Draft Outputs ({workingGroupsDraftOutputsCount})
              </TabLink>
            )}

            {!complete && (
              <TabLink href={route.upcoming({}).$}>
                Upcoming Events {`(${upcomingEventsCount})`}
              </TabLink>
            )}
            <TabLink href={route.past({}).$}>
              Past Events {`(${pastEventsCount})`}
            </TabLink>
          </TabNav>
        }
      >
        <div css={titleStyle}>
          <Display styleAsHeading={2}>{title}</Display>
          {complete && (
            <StateTag accent="green" icon={successIcon} label="Complete" />
          )}
        </div>
        <section css={contactSectionStyles}>
          <UserAvatarList
            members={[...leaders, ...members].map((member) => member.user)}
            fullListRoute={`${
              network({})
                .workingGroups({})
                .workingGroup({ workingGroupId: id })
                .about({}).$
            }#${membersListElementId}`}
          />
          {pointOfContact && !complete && (
            <div css={pointOfContactStyles}>
              <div css={{ display: 'flex', flexGrow: 1 }}>
                <Link
                  buttonStyle
                  small
                  primary
                  href={`${createMailTo(pointOfContact.user.email)}`}
                  noMargin
                >
                  Contact
                </Link>
              </div>
              <CopyButton
                hoverTooltipText="Copy Email"
                clickTooltipText="Email Copied"
                onClick={() =>
                  navigator.clipboard.writeText(pointOfContact.user.email)
                }
              />
            </div>
          )}

          {canShareResearchOutput && (
            <div css={createStyles}>
              <DropdownButton
                buttonChildren={() => (
                  <span css={dropdownButtonStyling}>
                    {plusIcon}
                    Share an output
                  </span>
                )}
              >
                {{
                  item: <>{article} Article</>,
                  href: route.createOutput({
                    outputDocumentType: 'article',
                  }).$,
                }}
                {{
                  item: <>{bioinformatics} Bioinformatics</>,
                  href: route.createOutput({
                    outputDocumentType: 'bioinformatics',
                  }).$,
                }}
                {{
                  item: <>{crnReportIcon} CRN Report</>,
                  href: route.createOutput({
                    outputDocumentType: 'report',
                  }).$,
                }}
                {{
                  item: <>{dataset} Dataset</>,
                  href: route.createOutput({
                    outputDocumentType: 'dataset',
                  }).$,
                }}
                {{
                  item: <>{labMaterial} Lab Material</>,
                  href: route.createOutput({
                    outputDocumentType: 'lab-material',
                  }).$,
                }}
                {{
                  item: <>{protocol} Protocol</>,
                  href: route.createOutput({
                    outputDocumentType: 'protocol',
                  }).$,
                }}
              </DropdownButton>
            </div>
          )}
        </section>
        <div css={rowStyles}>
          <div css={toolsStyles}>
            {externalLink && (
              <Link href={externalLink} buttonStyle small>
                {googleDriveIcon} Access Drive
              </Link>
            )}
            {calendars[0]?.id && !complete && (
              <CalendarLink id={calendars[0]?.id}>
                <span css={{ display: 'flex', gap: '8px' }}>
                  {systemCalendarIcon}Subscribe
                </span>
              </CalendarLink>
            )}
          </div>
          <div css={lastUpdatedStyles}>
            <Caption asParagraph accent="tertiary">
              Last updated:{' '}
              {formatDistance(new Date(), new Date(lastModifiedDate))} ago
            </Caption>
          </div>
        </div>
      </PageInfoContainer>
    </header>
  );
};

export default WorkingGroupPageHeader;
