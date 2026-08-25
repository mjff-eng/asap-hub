import { gp2 } from '@asap-hub/model';
import {
  crossQuery,
  ExternalLink,
  Paragraph,
  pixels,
  Subtitle,
} from '@asap-hub/react-components';
import { css } from '@emotion/react';
import StatusPill from '../molecules/StatusPill';

const { rem } = pixels;

const rowStyles = css({
  display: 'flex',
  paddingBottom: rem(16),
  flexDirection: 'row',
});

type ProjectMilestoneProps = {
  milestone: gp2.Milestone;
};

const Milestone: React.FC<ProjectMilestoneProps> = ({ milestone }) => (
  <>
    <div css={[rowStyles]}>
      <div css={css({ display: 'inline-flex' })}>
        <StatusPill status={milestone.status} />
      </div>
      {milestone.link && (
        <div
          css={css({
            paddingLeft: rem(44),
            [crossQuery]: {
              marginLeft: 'auto',
            },
          })}
        >
          <ExternalLink href={milestone.link} label="View Milestone" full />
        </div>
      )}
    </div>
    <Subtitle styleAsHeading={4} noMargin>
      {milestone.title}
    </Subtitle>
    <div css={css({ padding: `${rem(8)} 0` })}>
      <Paragraph noMargin accent="neutral900">
        {milestone.description}
      </Paragraph>
    </div>
  </>
);

export default Milestone;
