import { TeamResponse } from '@asap-hub/model';
import { dashboard, network } from '@asap-hub/routing';
import { css } from '@emotion/react';
import { useMemo } from 'react';
import { CopyButton, Display, Link, Pill, StateTag, TabLink } from '../atoms';
import { neutral900 } from '../colors';
import {
  DiscoveryProjectIcon,
  InactiveBadgeIcon,
  LabIcon,
  ResourceProjectIcon,
} from '../icons';
import { createMailTo } from '../mail';
import { Breadcrumbs, UserAvatarList, TabNav } from '../molecules';
import { mobileScreen, rem, tabletScreen } from '../pixels';
import {
  getCounterString,
  getProjectRoute,
  getTeamMembersByStatus,
} from '../utils';
import PageInfoContainer from './PageInfoContainer';

const titleStyle = css({
  display: 'flex',
  flexFlow: 'column',
  gap: 3,
  alignItems: 'flex-start',
  paddingBottom: rem(12),
  [`@media (min-width: ${mobileScreen.max}px)`]: {
    flexFlow: 'row',
    gap: rem(15),
    alignItems: 'center',
  },
});
const contactSectionStyles = css({
  alignItems: 'center',

  display: 'grid',
  gridColumnGap: rem(16),

  grid: `
    "members" auto
    "contact" auto
    "info"    auto
    "lab"     auto
  `,

  [`@media (min-width: ${mobileScreen.max}px)`]: {
    grid: `
      "contact members"
      "info info"
      "lab lab"/ max-content 1fr
    `,
  },
});
const pointOfContactStyles = css({
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

const labCountStyles = css({
  gridArea: 'lab',
  display: 'flex',
  alignItems: 'center',
  padding: `${rem(12)} 0`,
  color: neutral900.rgb,
});
const projectNameStyles = css({
  gridArea: 'info',
  display: 'flex',
  alignItems: 'center',
  gap: rem(8),
  marginTop: rem(12),
});
const iconStyles = css({
  display: 'inline-grid',
  paddingRight: rem(12),
});

const pillsStyles = css({
  display: 'flex',
  gap: rem(8),
  marginBottom: rem(4),
});

type TeamProfileHeaderProps = Readonly<Omit<TeamResponse, 'tools'>> & {
  readonly isStaff: boolean;
  readonly inactiveSince?: string;
  readonly teamListElementId: string;
  readonly upcomingEventsCount?: number;
  readonly pastEventsCount?: number;
  readonly isAsapTeam?: boolean;
  readonly showMetricsTab?: boolean;
};

const TeamProfileHeader: React.FC<TeamProfileHeaderProps> = ({
  id,
  displayName,
  members,
  pointOfContact,
  teamListElementId,
  labCount,
  upcomingEventsCount,
  pastEventsCount,
  isAsapTeam = false,
  showMetricsTab = false,
  teamStatus,
  teamType,
  resourceType,
  researchTheme,
  projectTitle,
  projectType,
  linkedProjectId,
}) => {
  const route = network({}).teams({}).team({ teamId: id });
  const projectLink =
    linkedProjectId && projectType
      ? getProjectRoute({
          projectId: linkedProjectId,
          projectType,
        })
      : undefined;

  const isActive = teamStatus === 'Active';

  const teamListCrumb =
    teamType === 'Resource Team'
      ? { label: 'Resource Teams', href: network({}).resourceTeams({}).$ }
      : { label: 'Discovery Teams', href: network({}).discoveryTeams({}).$ };

  const { activeMembers } = useMemo(
    () => getTeamMembersByStatus(members, !isActive),
    [members, isActive],
  );

  return (
    <header>
      <PageInfoContainer
        breadcrumbs={
          <Breadcrumbs
            homeHref={dashboard({}).$}
            items={[teamListCrumb, { label: displayName }]}
          />
        }
        nav={
          <TabNav>
            <TabLink href={route.about({}).$}>About</TabLink>
            {showMetricsTab && (
              <TabLink href={route.metrics({}).$}>Metrics</TabLink>
            )}
            {isActive && (
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
        <div css={pillsStyles}>
          <Pill noMargin>{teamType}</Pill>
          {researchTheme && <Pill noMargin>{researchTheme}</Pill>}
          {resourceType && <Pill noMargin>{resourceType}</Pill>}
        </div>
        <div css={titleStyle}>
          <Display styleAsHeading={2}>Team {displayName}</Display>
          {!isActive && (
            <StateTag icon={<InactiveBadgeIcon />} label="Inactive" />
          )}
        </div>
        <section css={contactSectionStyles}>
          {teamStatus === 'Active' && (
            <UserAvatarList
              members={activeMembers}
              fullListRoute={`${route.about({}).$}#${teamListElementId}`}
            />
          )}
          {pointOfContact && teamStatus === 'Active' && (
            <div css={pointOfContactStyles}>
              <span css={buttonStyles}>
                <Link
                  buttonStyle
                  small
                  primary
                  href={`${createMailTo(pointOfContact)}`}
                  noMargin
                >
                  Contact
                </Link>
              </span>
              <CopyButton
                hoverTooltipText="Copy Email"
                clickTooltipText="Email Copied"
                onClick={() => navigator.clipboard.writeText(pointOfContact)}
              />
            </div>
          )}
          {projectTitle ? (
            <div css={projectNameStyles} data-testid="project-icon">
              {teamType === 'Discovery Team' ? (
                <DiscoveryProjectIcon />
              ) : (
                <ResourceProjectIcon />
              )}
              {projectLink ? (
                <Link href={projectLink}>{projectTitle}</Link>
              ) : (
                projectTitle
              )}
            </div>
          ) : null}
          {labCount > 0 && teamStatus === 'Active' && !isAsapTeam && (
            <div css={labCountStyles}>
              <span css={iconStyles}>
                <LabIcon />
              </span>
              <span>{getCounterString(labCount, 'Lab')}</span>
            </div>
          )}
        </section>
      </PageInfoContainer>
    </header>
  );
};

export default TeamProfileHeader;
