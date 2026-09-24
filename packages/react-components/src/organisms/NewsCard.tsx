import { css } from '@emotion/react';
import { NewsResponse, NewsType, TutorialsResponse } from '@asap-hub/model';
import { news, discover } from '@asap-hub/routing';

import { Card, Headline4, Ellipsis } from '../atoms';
import { rem, smallDesktopScreen } from '../pixels';
import { formatDate } from '../date';
import { newsPlaceholder, trainingPlaceholderIcon } from '../icons';
import { ExternalLink, LinkHeadline, ImageLink } from '../molecules';
import { TagList, colour } from '..';
import { captionStyles } from '../text';

const imageStyle = css({
  objectFit: 'cover',
  width: '100%',
  height: '100%',
});

const imageContainerStyle = css({
  flexShrink: 0,
  borderRadius: rem(8),
  marginRight: rem(24),

  height: rem(192),
  width: rem(192),
  overflow: 'hidden',

  [`@media (max-width: ${smallDesktopScreen.min}px)`]: {
    display: 'none',
  },
});

const headerStyles = css({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
});

const titleStyles = css({
  paddingRight: rem(15),
});

const cardStyle = css({
  display: 'flex',
  flexDirection: 'row',
  padding: `${rem(32)} ${rem(24)}`,
});

const containerStyle = css({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: rem(24),
});

const shortTextStyles = css({
  flex: 1,
  color: colour.foreground.tertiary,
  overflowWrap: 'anywhere',
});

const footerStyles = css({
  ...captionStyles,
  color: colour.foreground.tertiary,
  justifySelf: 'flex-end',
});

const placeholders: Record<NewsType, JSX.Element> = {
  News: newsPlaceholder,
  Tutorial: trainingPlaceholderIcon,
};

const NewsCard: React.FC<
  (NewsResponse | TutorialsResponse) & { type: NewsType }
> = ({
  id,
  title,
  thumbnail,
  text,
  link,
  linkText,
  shortText,
  created,
  type,
  tags,
}) => {
  const href =
    type === 'Tutorial'
      ? discover({}).tutorials({}).tutorial({ tutorialId: id }).$
      : news({}).article({ articleId: id }).$;
  const titleComponent = text ? (
    <LinkHeadline href={href} level={4} noMargin>
      {title}
    </LinkHeadline>
  ) : (
    <Headline4 noMargin>{title}</Headline4>
  );
  const newsLink = text && href;

  const newsImage = (
    <>
      {thumbnail ? (
        <img
          alt={`"${title}"'s thumbnail`}
          src={thumbnail}
          css={[imageStyle]}
        />
      ) : (
        placeholders[type]
      )}
    </>
  );

  return (
    <Card padding={false}>
      <div css={cardStyle}>
        <div css={imageContainerStyle}>
          {newsLink ? (
            <ImageLink link={newsLink}>{newsImage}</ImageLink>
          ) : (
            newsImage
          )}
        </div>
        <div css={containerStyle}>
          <div css={headerStyles}>
            <div css={titleStyles}>{titleComponent}</div>
            {link ? <ExternalLink label={linkText} href={link} /> : null}
          </div>
          <div css={shortTextStyles}>
            <Ellipsis numberOfLines={3}>{shortText}</Ellipsis>
          </div>
          {!!tags.length && <TagList max={3} tags={tags} />}
          <span css={footerStyles}>
            Posted: {formatDate(new Date(created))} by ASAP
          </span>
        </div>
      </div>
    </Card>
  );
};

export default NewsCard;
