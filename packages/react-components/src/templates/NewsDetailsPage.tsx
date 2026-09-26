import { css } from '@emotion/react';
import { NewsResponse, NewsType, TutorialsResponse } from '@asap-hub/model';

import { Pill, Display, Card, Caption, Headline3, Paragraph } from '../atoms';
import { RichText } from '../organisms';
import { rem } from '../pixels';
import { formatDate } from '../date';
import { ExternalLink, TagList } from '../molecules';
import { PageConstraints } from '..';

const containerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(32),
});

const descriptionStyles = css({
  marginTop: rem(12),
  marginBottom: rem(24),
});

const footerContainer = css({
  marginTop: rem(30),
});

const richTextContainer = css({
  marginTop: rem(12),
  marginBottom: rem(24),
});

type NewsDetailsPageProps = (
  | Pick<
      NewsResponse,
      'text' | 'title' | 'created' | 'link' | 'linkText' | 'tags'
    >
  | Pick<
      TutorialsResponse,
      'text' | 'title' | 'created' | 'link' | 'linkText' | 'tags'
    >
) & { type: NewsType };

const NewsDetailsPage: React.FC<NewsDetailsPageProps> = ({
  text = '',
  created,
  title,
  link,
  linkText,
  type,
  tags,
}) => {
  const attachmentComponent = link ? (
    <div>
      <Caption bold asParagraph>
        Attachments
      </Caption>
      <ExternalLink href={link} label={linkText} />
    </div>
  ) : null;
  const publishDateComponent = (
    <Caption accent="tertiary" asParagraph>
      Posted: {formatDate(new Date(created))} by ASAP
    </Caption>
  );

  return (
    <PageConstraints>
      <div css={containerStyles}>
        <Card>
          <Pill>{type}</Pill>
          <Display styleAsHeading={3}>{title}</Display>
          {publishDateComponent}
          <div css={richTextContainer}>
            <RichText text={text} />
          </div>
          {attachmentComponent}
          <div css={footerContainer}>{publishDateComponent}</div>
        </Card>
        {!!tags.length && (
          <Card>
            <Headline3 noMargin>Tags</Headline3>
            <div css={descriptionStyles}>
              <Paragraph accent="tertiary">
                Explore keywords related to skills, techniques, resources, and
                tools.
              </Paragraph>
            </div>
            <div>
              <TagList tags={tags} />
            </div>
          </Card>
        )}
      </div>
    </PageConstraints>
  );
};

export default NewsDetailsPage;
