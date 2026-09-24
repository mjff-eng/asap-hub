import { ResearchOutputResponse } from '@asap-hub/model';
import { network, sharedResearch } from '@asap-hub/routing';
import { css } from '@emotion/react';

import { Card, Caption, StateTag } from '../atoms';
import {
  AssociationList,
  LinkHeadline,
  TagList,
  UsersList,
} from '../molecules';
import { formatDate } from '../date';
import { SharedResearchMetadata } from '.';
import { rem } from '../pixels';
import { getResearchOutputAssociationPill } from '../utils';

const associationStyles = css({
  display: 'flex',
  flexWrap: 'wrap',
  columnGap: rem(24),
  rowGap: rem(12),
});

const titleStyles = css({
  display: 'flex',
  columnGap: rem(15),
  flexWrap: 'wrap',
  marginBottom: rem(12),
});

const tagContainerStyles = css({
  marginTop: rem(24),
  marginBottom: rem(12),
});

type SharedResearchCardProps = Pick<
  ResearchOutputResponse,
  | 'publishingEntity'
  | 'published'
  | 'addedDate'
  | 'authors'
  | 'created'
  | 'documentType'
  | 'id'
  | 'labs'
  | 'link'
  | 'teams'
  | 'title'
  | 'type'
  | 'workingGroups'
  | 'isInReview'
  | 'keywords'
  | 'impact'
  | 'categories'
> & {
  showTags?: boolean;
};

const SharedResearchCard: React.FC<SharedResearchCardProps> = ({
  id: researchOutputId,
  created,
  addedDate,
  teams,
  title,
  authors,
  labs,
  workingGroups,
  type,
  documentType,
  link,
  published,
  publishingEntity,
  isInReview,
  keywords,
  showTags = true,
  impact,
  categories,
}) => {
  const associationPill = getResearchOutputAssociationPill({
    publishingEntity,
    teams,
    workingGroups,
  });

  return (
    <Card accent={published ? 'default' : 'neutral200'}>
      <SharedResearchMetadata
        pills={[
          associationPill,
          ...(documentType ? [documentType] : []),
          ...(type ? [type] : []),
        ]}
        link={link}
      />
      <div css={titleStyles}>
        <LinkHeadline
          level={2}
          styleAsHeading={4}
          href={sharedResearch({}).researchOutput({ researchOutputId }).$}
        >
          {title}
        </LinkHeadline>
        {!published && (
          <div css={{ margin: `auto 0 ${rem(12)} 0` }}>
            <StateTag
              label={isInReview ? 'In Review' : 'Draft'}
              accent={isInReview ? 'blue' : undefined}
            />
          </div>
        )}
      </div>
      <UsersList
        max={3}
        users={authors.map((author) => ({
          ...author,
          href:
            author.id && network({}).users({}).user({ userId: author.id }).$,
        }))}
      />
      <div css={associationStyles}>
        <AssociationList
          type="Lab"
          inline
          max={1}
          associations={labs.map(({ id, name }) => ({ displayName: name, id }))}
        />
        <AssociationList type="Team" inline max={3} associations={teams} />
        {workingGroups && (
          <AssociationList
            type="Working Group"
            inline
            max={3}
            associations={workingGroups.map(({ id, title: displayName }) => ({
              id,
              displayName,
            }))}
          />
        )}
        {impact && impact.name && (
          <AssociationList
            type="Impact"
            inline
            associations={[{ id: impact.id, displayName: impact.name }]}
          />
        )}
        {categories && categories.length > 0 && (
          <AssociationList
            type="Category"
            inline
            associations={categories.map(({ id, name }) => ({
              id,
              displayName: name,
            }))}
          />
        )}
      </div>
      {showTags && keywords.length > 0 && (
        <div css={tagContainerStyles}>
          <TagList max={3} tags={keywords} />
        </div>
      )}
      <Caption accent={'neutral900'} asParagraph>
        Date Added: {formatDate(new Date(addedDate || created))}
      </Caption>
    </Card>
  );
};

export default SharedResearchCard;
