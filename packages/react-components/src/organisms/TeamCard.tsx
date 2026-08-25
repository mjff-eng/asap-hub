import { css } from '@emotion/react';
import { TeamListItemResponse } from '@asap-hub/model';
import { network } from '@asap-hub/routing';

import { StateTag } from '../atoms';
import { mobileScreen, rem } from '../pixels';
import { neutral900 } from '../colors';
import {
  TeamIcon,
  LabIcon,
  InactiveBadgeIcon,
  DiscoveryProjectIcon,
  ResourceProjectIcon,
} from '../icons';
import { getCounterString, getProjectRoute } from '../utils';
import { EntityCard } from '.';

const footerStyles = css({
  color: neutral900.rgb,

  display: 'flex',
  flexDirection: 'column',
  gap: rem(16),

  [`@media (min-width: ${mobileScreen.max}px)`]: {
    flexDirection: 'row',
    gap: rem(32),
  },
});

const iconStyles = css({
  display: 'inline-grid',
  verticalAlign: 'middle',
  paddingRight: rem(8),
});

type TeamCardProps = Omit<TeamListItemResponse, 'teamStatus'>;

const TeamCard: React.FC<TeamCardProps> = ({
  id,
  displayName,
  inactiveSince,
  projectTitle,
  tags,
  memberCount,
  labCount,
  teamType,
  researchTheme,
  resourceType,
  linkedProjectId,
  projectType,
}) => {
  const href = network({}).teams({}).team({ teamId: id }).$;
  const isAsapTeam = displayName === 'ASAP';
  const projectLink =
    linkedProjectId && projectType
      ? getProjectRoute({
          projectId: linkedProjectId,
          projectType,
        })
      : undefined;

  const footer = (
    <div css={footerStyles}>
      <div>
        <span css={iconStyles}>
          <TeamIcon />{' '}
        </span>
        <span>{getCounterString(memberCount, 'Team Member')}</span>
      </div>
      {!isAsapTeam && labCount > 0 && (
        <div>
          <span css={iconStyles}>
            <LabIcon />{' '}
          </span>
          <span>{getCounterString(labCount, 'Lab')}</span>
        </div>
      )}
    </div>
  );

  return (
    <EntityCard
      active={!inactiveSince}
      footer={!inactiveSince ? footer : undefined}
      href={href}
      inactiveBadge={<StateTag icon={<InactiveBadgeIcon />} label="Inactive" />}
      tags={tags.map(({ name }) => name)}
      text={projectTitle}
      textHref={projectLink}
      title={`Team ${displayName}`}
      teamType={teamType}
      researchTheme={
        teamType === 'Discovery Team' && researchTheme
          ? researchTheme
          : undefined
      }
      resourceType={
        teamType === 'Resource Team' && resourceType ? resourceType : undefined
      }
      textIcon={
        teamType === 'Discovery Team' ? (
          <DiscoveryProjectIcon />
        ) : (
          <ResourceProjectIcon />
        )
      }
      isTeamCard={true}
    />
  );
};

export default TeamCard;
