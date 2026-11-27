import { css } from '@emotion/react';
import { ProjectMember } from '@asap-hub/model';
import { useMemo } from 'react';
import { rem, tabletScreen } from '../pixels';
import { groupProjectMembersByUserId } from '../utils';
import ProjectMemberCard from './ProjectMemberCard';
import { pageGutter } from '../layout';

const membersListStyles = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  rowGap: rem(24),
  columnGap: pageGutter,
  [`@media (max-width: ${tabletScreen.min}px)`]: {
    gridTemplateColumns: '1fr',
  },
});

type ProjectMembersProps = {
  readonly members: ReadonlyArray<ProjectMember>;
};

const ProjectMembers: React.FC<ProjectMembersProps> = ({ members }) => {
  const grouped = useMemo(
    () => groupProjectMembersByUserId(members),
    [members],
  );

  return (
    <div css={membersListStyles}>
      {grouped.map((member) => (
        <ProjectMemberCard key={member.id} member={member} />
      ))}
    </div>
  );
};

export default ProjectMembers;
