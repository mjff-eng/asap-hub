import { gp2 as gp2Model } from '@asap-hub/model';
import {
  Card,
  Display,
  formatDate,
  LinkHeadline,
  pixels,
  SharedResearchMetadata,
  UsersList,
  TagList,
  neutral900,
} from '@asap-hub/react-components';
import { gp2 as gp2Routing } from '@asap-hub/routing';
import { css } from '@emotion/react';

import { AssociationList } from '../molecules';

const { rem, mobileScreen } = pixels;

const cardContainerStyles = css({
  padding: rem(24),
});

const detailedViewContainerStyles = css({
  padding: `${rem(32)} ${rem(24)}`,
});

const titleStyles = css({
  display: 'flex',
  marginBottom: rem(12),
});

const entitiesStyles = css({
  gap: rem(15),
  margin: `${rem(4)} 0 ${rem(32)}`,
  display: 'flex',
  flexDirection: 'column',

  '&.reverse': {
    flexDirection: 'column-reverse',
  },
});

const timestampStyles = css({
  color: neutral900.rgb,
  display: 'flex',
  flexDirection: 'row',
  whiteSpace: 'pre',
  fontSize: rem(14),
  fontWeight: 400,
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    flexDirection: 'column',
  },
});

const tagListContainerStyles = css({
  marginBottom: rem(24),
});

type OutputCardProps = Pick<
  gp2Model.OutputResponse,
  | 'id'
  | 'addedDate'
  | 'created'
  | 'lastUpdatedPartial'
  | 'title'
  | 'workingGroups'
  | 'projects'
  | 'authors'
  | 'link'
  | 'documentType'
  | 'type'
  | 'subtype'
  | 'mainEntity'
  | 'tags'
> & {
  detailedView?: boolean;
  showTags?: boolean;
};

const OutputCard: React.FC<OutputCardProps> = ({
  id,
  addedDate,
  created,
  lastUpdatedPartial,
  title,
  workingGroups,
  projects,
  documentType,
  type,
  subtype,
  authors,
  link,
  mainEntity,
  detailedView = false,
  showTags = false,
  tags,
}) => (
  <Card padding={false}>
    <div css={detailedView ? detailedViewContainerStyles : cardContainerStyles}>
      <div css={css({ display: 'flex', gap: rem(24) })}>
        <SharedResearchMetadata
          pills={
            [
              mainEntity.type === 'WorkingGroups' ? 'Working Group' : 'Project',
              documentType,
              type,
              subtype,
            ].filter(Boolean) as string[]
          }
          link={link}
          small={false}
        />
      </div>
      {detailedView ? (
        <span css={titleStyles}>
          <Display styleAsHeading={3}>{title}</Display>
        </span>
      ) : (
        <div css={css({ margin: `${rem(12)} 0 ${rem(24)}` })}>
          <LinkHeadline
            level={2}
            styleAsHeading={4}
            href={gp2Routing.outputs({}).output({ outputId: id }).$}
          >
            {title}
          </LinkHeadline>
        </div>
      )}
      <UsersList
        users={authors.map((author) => ({
          ...author,
          href: author.id && gp2Routing.users({}).user({ userId: author.id }).$,
        }))}
        max={detailedView ? undefined : 3}
      />
      <div
        css={entitiesStyles}
        className={`${mainEntity.type === 'Projects' ? 'reverse' : ''}`}
      >
        {workingGroups?.length && (
          <AssociationList
            type="Working Group"
            inline
            associations={workingGroups}
            max={detailedView ? undefined : 1}
          />
        )}
        {projects?.length && (
          <AssociationList
            type="Project"
            inline
            associations={projects}
            max={detailedView ? undefined : 1}
          />
        )}
      </div>
      {showTags && tags.length > 0 && (
        <div css={tagListContainerStyles}>
          <TagList max={3} tags={tags.map((tag) => tag.name)} />
        </div>
      )}
      <div css={timestampStyles}>
        <span>Date added: {formatDate(new Date(addedDate || created))}</span>
        {detailedView && (
          <span>
            {' '}
            · Last updated: {formatDate(new Date(lastUpdatedPartial))}
          </span>
        )}
      </div>
    </div>
  </Card>
);

export default OutputCard;
