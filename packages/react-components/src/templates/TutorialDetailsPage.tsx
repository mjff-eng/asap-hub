import React, { ComponentProps } from 'react';
import { css } from '@emotion/react';
import { TutorialsResponse } from '@asap-hub/model';

import { Card, Headline2, Divider, Paragraph } from '../atoms';
import { rem } from '../pixels';
import { TagList } from '../molecules';
import {
  RelatedTutorialsCard,
  RichText,
  TutorialAdditionalInformationCard,
  TutorialHeaderCard,
  RelatedEventsCard,
  HelpSection,
} from '../organisms';
import PageConstraints from './PageConstraints';

const tagsContainer = css({
  margin: `${rem(12)} 0 ${rem(12)} 0`,
});

const cardsStyles = css({
  display: 'grid',
  rowGap: rem(36),
});

type TutorialDetailsPageProps = Pick<
  TutorialsResponse,
  'text' | 'tags' | 'relatedTutorials' | 'relatedEvents'
> &
  ComponentProps<typeof TutorialHeaderCard> &
  ComponentProps<typeof TutorialAdditionalInformationCard>;

const TutorialDetailsPage: React.FC<TutorialDetailsPageProps> = ({
  text,
  relatedTutorials,
  relatedEvents,
  tags,
  ...props
}) => {
  const hasAdditionalInformation = [
    props.asapFunded,
    props.sharingStatus,
    props.usedInPublication,
  ].some((info) => info != null);

  return (
    <PageConstraints>
      <div css={cardsStyles}>
        <TutorialHeaderCard {...props} />
        {(text || !!tags.length) && (
          <Card>
            {text && (
              <div css={{ paddingBottom: rem(12) }}>
                <Headline2>Description</Headline2>
                <RichText text={text} />
              </div>
            )}
            {text && !!tags.length && <Divider />}
            {!!tags.length && (
              <>
                <Headline2>Tags</Headline2>
                <Paragraph noMargin accent="tertiary">
                  Explore keywords related to skills, techniques, resources, and
                  tools.
                </Paragraph>
                <div css={tagsContainer}>
                  <TagList tags={tags} />
                </div>
              </>
            )}
          </Card>
        )}
        {!!relatedTutorials.length && (
          <RelatedTutorialsCard
            relatedTutorials={relatedTutorials}
            truncateFrom={3}
          />
        )}
        {!!relatedEvents.length && (
          <RelatedEventsCard relatedEvents={relatedEvents} truncateFrom={3} />
        )}
        {hasAdditionalInformation && (
          <TutorialAdditionalInformationCard {...props} />
        )}
        <HelpSection hideTechSupportText />
      </div>
    </PageConstraints>
  );
};
export default TutorialDetailsPage;
