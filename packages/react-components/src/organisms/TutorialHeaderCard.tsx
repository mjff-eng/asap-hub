import { css } from '@emotion/react';
import { TutorialsResponse } from '@asap-hub/model';
import { network } from '@asap-hub/routing';

import { Card, Display } from '../atoms';
import { rem, mobileScreen } from '../pixels';
import { formatDate } from '../date';
import { ExternalLink, UsersList, AssociationList } from '../molecules';
import { colour } from '..';
import { captionStyles } from '../text';

const timestampStyles = css({
  color: colour.foreground.tertiary,
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

const headerStyle = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  paddingBottom: rem(24),
  [`@media (min-width: ${mobileScreen.max}px)`]: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(15),
  },
});

const associationStyles = css({
  display: 'flex',
  flexDirection: 'column',
  rowGap: rem(6),
});

type TutorialHeaderCardProps = Pick<
  TutorialsResponse,
  | 'authors'
  | 'created'
  | 'lastUpdated'
  | 'link'
  | 'linkText'
  | 'teams'
  | 'title'
>;

const TutorialHeaderCard: React.FC<TutorialHeaderCardProps> = ({
  title,
  link,
  linkText,
  created,
  lastUpdated,
  authors,
  teams,
}) => (
  <Card>
    <div css={headerStyle}>
      <div css={{ paddingRight: rem(15) }}>
        <Display styleAsHeading={3}>{title}</Display>
      </div>
      {link ? <ExternalLink label={linkText} href={link} /> : null}
    </div>
    <UsersList
      users={authors.map((author) => ({
        ...author,
        href: author.id && network({}).users({}).user({ userId: author.id }).$,
      }))}
    />
    <div css={associationStyles}>
      <AssociationList type="Team" inline associations={teams} />
    </div>
    <div css={[timestampStyles, captionStyles]}>
      <span>Date added: {formatDate(new Date(created))}</span>
      {lastUpdated && (
        <span> . Last updated: {formatDate(new Date(lastUpdated))}</span>
      )}
    </div>
  </Card>
);

export default TutorialHeaderCard;
