import { gp2 as gp2Model } from '@asap-hub/model';
import {
  Card,
  crossQuery,
  LinkHeadline,
  pixels,
  TagList,
  neutral900,
  colour,
} from '@asap-hub/react-components';
import { gp2 as gp2Routing } from '@asap-hub/routing';
import { css } from '@emotion/react';
import { ComponentProps } from 'react';
import colors from '../templates/colors';
import ProjectSummaryFooter from './ProjectSummaryFooter';
import ProjectSummaryHeader from './ProjectSummaryHeader';

const { rem } = pixels;

type ProjectCardProps = ComponentProps<typeof ProjectSummaryHeader> &
  Pick<
    gp2Model.ProjectResponse,
    'title' | 'startDate' | 'endDate' | 'members' | 'id' | 'tags'
  >;

const rowStyles = css({
  display: 'flex',
  flexDirection: 'column',
  [crossQuery]: {
    flexDirection: 'row',
  },
});

export const cardStyles: Record<
  gp2Model.ProjectResponse['status'],
  { color: string }
> = {
  Active: {
    color: colors.info500.rgba,
  },
  Completed: {
    color: colors.secondary500.rgba,
  },
  Paused: {
    color: colour.foreground.warning,
  },
};

const tagContainerStyles = css({
  padding: `${rem(24)} 0`,
});

const ProjectCard: React.FC<ProjectCardProps> = ({
  title,
  status,
  startDate,
  endDate,
  members,
  id,
  projectProposalUrl,
  traineeProject,
  opportunitiesAvailable,
  tags,
}) => (
  <Card stroke strokeColor={cardStyles[status].color} strokeSize={9}>
    <ProjectSummaryHeader
      projectProposalUrl={projectProposalUrl}
      status={status}
      traineeProject={traineeProject}
      opportunitiesAvailable={opportunitiesAvailable}
    />
    <LinkHeadline
      href={
        gp2Routing.projects({}).project({
          projectId: id,
        }).$
      }
      level={3}
    >
      {title}
    </LinkHeadline>
    {tags.length > 0 && (
      <div css={tagContainerStyles}>
        <TagList max={3} tags={tags.map((tag) => tag.name)} />
      </div>
    )}
    <div
      css={[
        rowStyles,
        css({
          [crossQuery]: {
            gap: rem(32),
          },
          color: neutral900.rgb,
        }),
      ]}
    >
      <ProjectSummaryFooter
        members={members}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  </Card>
);

export default ProjectCard;
