import { css } from '@emotion/react';
import { TutorialsResponse } from '@asap-hub/model';
import { network, discover } from '@asap-hub/routing';

import { Card, Paragraph } from '../atoms';
import { rem, smallDesktopScreen } from '../pixels';
import { formatDate } from '../date';
import { trainingPlaceholderIcon } from '../icons';
import {
  ExternalLink,
  LinkHeadline,
  ImageLink,
  UsersList,
  AssociationList,
  TagList,
} from '../molecules';
import { neutral900 } from '..';
import { captionStyles } from '../text';

const imageStyle = css({
  objectFit: 'cover',
  width: '100%',
  height: '100%',
});

const imageContainerStyle = css({
  flexShrink: 0,
  borderRadius: rem(6),
  height: rem(184),
  marginTop: rem(9),
  marginBottom: rem(3),

  marginRight: rem(24),
  width: rem(184),
  overflow: 'hidden',

  [`@media (max-width: ${smallDesktopScreen.min}px)`]: {
    display: 'none',
  },
});

const headerStyles = css({
  display: 'flex',
  justifyContent: 'space-between',
});

const associationsContainer = css({
  margin: `${rem(24)} 0 ${rem(12)} 0`,
});

const cardStyle = css({
  display: 'flex',
  flexDirection: 'row',
  marginBottom: rem(6),
});

const containerStyle = css({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
});

const footerStyles = css({
  ...captionStyles,
  color: neutral900.rgb,
  justifySelf: 'flex-end',
});

type TutorialCardProps = Pick<
  TutorialsResponse,
  | 'authors'
  | 'created'
  | 'id'
  | 'link'
  | 'linkText'
  | 'teams'
  | 'shortText'
  | 'thumbnail'
  | 'title'
  | 'tags'
>;

const TutorialCard: React.FC<TutorialCardProps> = ({
  id,
  title,
  thumbnail,
  link,
  linkText,
  shortText,
  created,
  authors,
  teams,
  tags,
}) => {
  const href = discover({}).tutorials({}).tutorial({ tutorialId: id }).$;

  const tutorialImage = (
    <>
      {thumbnail ? (
        <img
          alt={`"${title}"'s thumbnail`}
          src={thumbnail}
          css={[imageStyle]}
        />
      ) : (
        trainingPlaceholderIcon
      )}
    </>
  );

  return (
    <Card>
      <div css={cardStyle}>
        <div css={imageContainerStyle}>
          <ImageLink link={href}>{tutorialImage}</ImageLink>
        </div>
        <div css={containerStyle}>
          <div css={headerStyles}>
            <div css={{ paddingRight: rem(15) }}>
              <LinkHeadline href={href} level={4}>
                {title}
              </LinkHeadline>
            </div>
            {link ? <ExternalLink label={linkText} href={link} /> : null}
          </div>
          <div css={{ flex: 1 }}>
            <Paragraph accent="neutral900">{shortText}</Paragraph>
          </div>
          {!!authors.length && (
            <div css={associationsContainer}>
              <UsersList
                max={3}
                users={authors.map((author) => ({
                  ...author,
                  href:
                    author.id &&
                    network({}).users({}).user({ userId: author.id }).$,
                }))}
              />
            </div>
          )}
          {!!teams.length && (
            <AssociationList type="Team" inline max={3} associations={teams} />
          )}
          {!!tags.length && (
            <div css={associationsContainer}>
              <TagList max={3} tags={tags} />
            </div>
          )}
          <span css={footerStyles}>
            Posted: {formatDate(new Date(created))}
          </span>
        </div>
      </div>
    </Card>
  );
};

export default TutorialCard;
