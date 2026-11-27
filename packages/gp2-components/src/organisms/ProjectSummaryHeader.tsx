import { gp2 as gp2Model } from '@asap-hub/model';
import {
  mediaFrom,
  ExternalLink,
  Pill,
  pixels,
} from '@asap-hub/react-components';
import { css } from '@emotion/react';
import StatusPill from '../molecules/StatusPill';

const { rem } = pixels;

const rowStyles = css({
  display: 'flex',
  flexDirection: 'column',
  [mediaFrom.laptop]: {
    flexDirection: 'row',
  },
});

type ProjectSummaryHeaderProps = Pick<
  gp2Model.ProjectResponse,
  'status' | 'projectProposalUrl' | 'traineeProject' | 'opportunitiesAvailable'
>;

const ProjectSummaryHeader: React.FC<ProjectSummaryHeaderProps> = ({
  status,
  projectProposalUrl,
  traineeProject,
  opportunitiesAvailable,
}) => (
  <div css={[rowStyles, css({ gap: rem(4) })]}>
    <div css={css({ display: 'inline-flex', gap: rem(8) })}>
      <StatusPill status={status} />
      {opportunitiesAvailable && (
        <Pill small={false}>Opportunities available</Pill>
      )}
      {traineeProject && <Pill small={false}>Trainee project</Pill>}
    </div>
    {projectProposalUrl && (
      <div
        css={css({
          [mediaFrom.laptop]: {
            marginLeft: 'auto',
          },
        })}
      >
        <ExternalLink href={projectProposalUrl} label="View proposal" full />
      </div>
    )}
  </div>
);

export default ProjectSummaryHeader;
