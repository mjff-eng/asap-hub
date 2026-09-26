import { css } from '@emotion/react';
import { Headline3, Link, Paragraph } from '../atoms';
import { colour } from '../colors';
import { paperClipIcon } from '../icons';
import { createMailTo } from '../mail';
import { rem } from '../pixels';

const containerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
});

const textContainerStyles = css({
  maxWidth: rem(632),
});

const iconStyles = css({
  '> svg': {
    height: rem(48),
    width: 'auto',
  },
  'svg path[stroke]': {
    stroke: colour.foreground.primary,
  },
  'svg path[stroke-width]': {
    strokeWidth: 1,
  },
});

type variant = 'coming-soon' | 'stale';

type EventMaterialsEmptyViewProps = {
  variant: variant;
};

const EventMaterialsEmptyView: React.FC<EventMaterialsEmptyViewProps> = ({
  variant,
}) => (
  <div css={[containerStyles, iconStyles]}>
    {paperClipIcon}
    <Headline3>No meeting materials available.</Headline3>
    {variant === 'stale' ? (
      <Paragraph accent="tertiary">
        Nothing was shared for this event.{' '}
        <Link href={createMailTo('hub@asap.science')}>Contact ASAP</Link> if you
        have any questions.
      </Paragraph>
    ) : (
      <div css={textContainerStyles}>
        <Paragraph accent="tertiary">
          Meeting Materials for this event will be coming soon - usually within
          a week after the event. Please check back later.
        </Paragraph>
      </div>
    )}
  </div>
);

export default EventMaterialsEmptyView;
