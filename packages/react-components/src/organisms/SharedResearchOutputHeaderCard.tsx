import { ResearchOutputResponse } from '@asap-hub/model';
import { css } from '@emotion/react';
import { network } from '@asap-hub/routing';

import { Card, Display, StateTag } from '../atoms';
import { neutral900 } from '../colors';
import { formatDate } from '../date';
import { rem, mobileScreen } from '../pixels';
import { captionStyles } from '../text';
import { AssociationList, UsersList } from '../molecules';
import { SharedResearchMetadata } from '.';

const timestampStyles = css({
  color: neutral900.rgb,
  display: 'flex',
  flexDirection: 'row',
  whiteSpace: 'pre',
  marginTop: rem(24),
  marginBottom: 0,
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    flexDirection: 'column',
    marginTop: rem(12),
    marginBottom: rem(12),
  },
});
const associationStyles = css({
  display: 'flex',
  flexDirection: 'column',
  rowGap: rem(12),
});

const headerStyle = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  paddingBottom: rem(24),
  [`@media (min-width: ${mobileScreen.max}px)`]: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(15),
  },
});

type SharedResearchOutputHeaderCardProps = Pick<
  ResearchOutputResponse,
  | 'addedDate'
  | 'authors'
  | 'created'
  | 'documentType'
  | 'labs'
  | 'lastUpdatedPartial'
  | 'link'
  | 'teams'
  | 'title'
  | 'type'
  | 'workingGroups'
  | 'published'
  | 'isInReview'
  | 'impact'
  | 'categories'
  | 'publishingEntity'
> & {
  isProjectOutput?: boolean;
};

const SharedResearchOutputHeaderCard: React.FC<
  SharedResearchOutputHeaderCardProps
> = ({
  created,
  addedDate,
  authors,
  teams,
  title,
  lastUpdatedPartial,
  labs,
  workingGroups,
  documentType,
  type,
  link,
  published,
  isInReview,
  impact,
  categories,
  publishingEntity,
  isProjectOutput = false,
}) => (
  <Card>
    <SharedResearchMetadata
      pills={[
        workingGroups
          ? 'Working Group'
          : publishingEntity === 'Project' || isProjectOutput
            ? 'Project'
            : 'Team',
        ...(documentType ? [documentType] : []),
        ...(type ? [type] : []),
      ]}
      link={link}
    />
    <span css={headerStyle}>
      <Display styleAsHeading={3}>{title}</Display>
      {!published && (
        <StateTag
          label={isInReview ? 'In Review' : 'Draft'}
          accent={isInReview ? 'blue' : undefined}
        />
      )}
    </span>

    <UsersList
      users={authors.map((author) => ({
        ...author,
        href: author.id && network({}).users({}).user({ userId: author.id }).$,
      }))}
    />
    <div css={associationStyles}>
      <AssociationList
        type="Lab"
        inline
        associations={labs.map(({ name, id }) => ({
          displayName: name,
          id,
        }))}
      />
      <AssociationList type="Team" inline associations={teams} />
      <AssociationList
        type="Working Group"
        inline
        associations={
          workingGroups
            ? workingGroups.map(({ id, title: displayName }) => ({
                id,
                displayName,
              }))
            : []
        }
      />
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
    <div css={[timestampStyles, captionStyles]}>
      <span>Date added: {formatDate(new Date(addedDate || created))} · </span>
      <span>Last updated: {formatDate(new Date(lastUpdatedPartial))}</span>
    </div>
  </Card>
);

export default SharedResearchOutputHeaderCard;
