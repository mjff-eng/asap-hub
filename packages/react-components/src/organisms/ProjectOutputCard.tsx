import { Card } from '../atoms';
import { ProjectOutputBody } from '../molecules';
import type { ProjectOutput } from '../molecules';

export type ProjectOutputCardProps = ProjectOutput & {
  showTags?: boolean;
};

const ProjectOutputCard: React.FC<ProjectOutputCardProps> = ({
  showTags = true,
  ...output
}) => (
  <Card accent={output.published ? 'default' : 'inactive'}>
    <ProjectOutputBody variant="card" showTags={showTags} {...output} />
  </Card>
);

export default ProjectOutputCard;
