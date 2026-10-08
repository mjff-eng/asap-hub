import { css } from '@emotion/react';
import { ResearchOutputResponse } from '@asap-hub/model';
import { sharedResearch } from '@asap-hub/routing';

import { Card, Anchor, Headline2 } from '../atoms';
import { colour } from '../colors';
import { paddingStyles } from '../card';
import SharedResearchMetadata from './SharedResearchMetadata';
import AlgoliaHit from '../atoms/AlgoliaHit';
import { getResearchOutputAssociationPill } from '../utils';

const containerStyles = css({
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

const itemStyles = css({
  borderBottom: `1px solid ${colour.border.tertiary}`,
  display: 'grid',
  '&:last-of-type': {
    borderBottom: 'none',
  },
});

type SharedResearchListCardProps = {
  algoliaQueryId?: string;
  researchOutputs: ReadonlyArray<
    Pick<
      ResearchOutputResponse,
      | 'id'
      | 'title'
      | 'workingGroups'
      | 'documentType'
      | 'type'
      | 'link'
      | 'publishingEntity'
      | 'teams'
    >
  >;
};

const SharedResearchListCard: React.FC<SharedResearchListCardProps> = ({
  researchOutputs,
  algoliaQueryId,
}) => (
  <Card padding={false}>
    <ul css={containerStyles}>
      {researchOutputs.map(
        (
          {
            title,
            id,
            workingGroups,
            documentType,
            type,
            link,
            publishingEntity,
            teams,
          },
          index,
        ) => (
          <li key={`output-${id}`} css={[itemStyles, paddingStyles]}>
            <AlgoliaHit
              index={index}
              algoliaQueryId={algoliaQueryId}
              objectId={id}
            >
              <SharedResearchMetadata
                pills={[
                  getResearchOutputAssociationPill({
                    publishingEntity,
                    teams,
                    workingGroups,
                  }),
                  ...(documentType ? [documentType] : []),
                  ...(type ? [type] : []),
                ]}
                link={link}
              />
              <Anchor
                href={
                  sharedResearch({}).researchOutput({ researchOutputId: id }).$
                }
              >
                <Headline2 styleAsHeading={5}>{title}</Headline2>
              </Anchor>
            </AlgoliaHit>
          </li>
        ),
      )}
    </ul>
  </Card>
);

export default SharedResearchListCard;
