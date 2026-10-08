import { css } from '@emotion/react';
import { addHours, isBefore, parseISO } from 'date-fns';
import {
  BasicEvent,
  EVENT_CONSIDERED_PAST_HOURS_AFTER_EVENT,
} from '@asap-hub/model';

import { Divider, Headline2, Paragraph } from '../atoms';
import { RichText, TagList } from '..';
import { Collapsible, ExpandableText } from '../molecules';
import { rem } from '../pixels';

const TAGS_COPY =
  'Explore keywords related to skills, techniques, resources, and tools.';

const expandableColumnStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(24),
});

const expandableTextSpacingStyles = css({
  'p:first-of-type': {
    marginTop: 0,
  },
  'p:last-of-type': {
    marginBottom: 0,
  },
});

type EventAboutProps = Pick<BasicEvent, 'description' | 'endDate'> & {
  tags: string[];
  variant?: 'collapsible' | 'expandable';
};

const EventAbout: React.FC<EventAboutProps> = ({
  tags,
  description,
  endDate,
  variant = 'collapsible',
}) => {
  if (variant === 'expandable') {
    return (
      <div css={expandableColumnStyles}>
        {description ? (
          <div css={expandableColumnStyles}>
            <Headline2 noMargin styleAsHeading={4}>
              About this event
            </Headline2>
            <div css={expandableTextSpacingStyles}>
              <ExpandableText variant="arrow" toggleMarginTop={22}>
                <RichText text={description} toc={false} />
              </ExpandableText>
            </div>
          </div>
        ) : null}
        {description && tags.length ? <Divider /> : null}
        {tags.length ? (
          <div>
            <Headline2 noMargin styleAsHeading={4}>
              Tags
            </Headline2>
            <div css={{ marginTop: rem(24), marginBottom: rem(32) }}>
              <Paragraph noMargin accent="tertiary">
                {TAGS_COPY}
              </Paragraph>
            </div>
            <TagList tags={tags} />
          </div>
        ) : null}
      </div>
    );
  }

  const descriptionComponent = description ? (
    <div>
      <Headline2 styleAsHeading={4}>About this event</Headline2>
      <Collapsible
        initiallyExpanded={isBefore(
          new Date(),
          addHours(parseISO(endDate), EVENT_CONSIDERED_PAST_HOURS_AFTER_EVENT),
        )}
      >
        <RichText text={description} toc={false} />
      </Collapsible>
    </div>
  ) : null;

  const tagsComponent = tags.length ? (
    <div>
      <Headline2 styleAsHeading={4}>Tags</Headline2>
      <div
        css={{
          marginTop: rem(12),
          marginBottom: rem(24),
        }}
      >
        <Paragraph noMargin accent="tertiary">
          {TAGS_COPY}
        </Paragraph>
      </div>
      <TagList tags={tags} />
    </div>
  ) : null;

  const dividerComponent =
    descriptionComponent && tagsComponent ? <Divider /> : null;

  return (
    <>
      {descriptionComponent}
      {dividerComponent}
      {tagsComponent}
    </>
  );
};

export default EventAbout;
