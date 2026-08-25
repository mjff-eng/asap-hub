import { css } from '@emotion/react';

import { Card } from '../atoms';
import { ProjectOutputBody } from '../molecules';
import type { ProjectOutput } from '../molecules';
import { neutral500 } from '../colors';
import { paddingStyles } from '../card';
import AlgoliaHit from '../atoms/AlgoliaHit';
import { rem } from '../pixels';

const containerStyles = css({
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

const itemStyles = css({
  borderBottom: `1px solid ${neutral500.rgb}`,
  display: 'grid',
  rowGap: rem(12),
  '&:last-of-type': {
    borderBottom: 'none',
  },
});

type ProjectOutputListCardProps = {
  algoliaQueryId?: string;
  researchOutputs: ReadonlyArray<ProjectOutput>;
  showTags?: boolean;
};

const ProjectOutputListCard: React.FC<ProjectOutputListCardProps> = ({
  researchOutputs,
  algoliaQueryId,
  showTags = true,
}) => (
  <Card padding={false}>
    <ul css={containerStyles}>
      {researchOutputs.map((output, index) => (
        <li key={output.id} css={[itemStyles, paddingStyles]}>
          <AlgoliaHit
            index={index}
            algoliaQueryId={algoliaQueryId}
            objectId={output.id}
          >
            <ProjectOutputBody variant="list" showTags={showTags} {...output} />
          </AlgoliaHit>
        </li>
      ))}
    </ul>
  </Card>
);

export default ProjectOutputListCard;
