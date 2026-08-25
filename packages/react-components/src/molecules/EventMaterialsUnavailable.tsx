import { isEnabled } from '@asap-hub/flags';
import { css } from '@emotion/react';
import { Card, Headline2, Headline3, Link, Paragraph } from '../atoms';
import { neutral1000 } from '../colors';
import { paperClipIcon } from '../icons';
import { createMailTo } from '../mail';
import { rem } from '../pixels';

const iconStyles = css({
  '> svg': {
    height: rem(48),
    width: 'auto',
  },
  'svg path[stroke]': {
    stroke: neutral1000.rgba,
  },
  'svg path[stroke-width]': {
    strokeWidth: 1,
  },
});
const EventMaterialUnavailable: React.FC<Record<string, never>> = () => {
  if (isEnabled('NEW_EVENT_PAGE')) {
    return (
      <div
        css={[
          css({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }),
          iconStyles,
        ]}
      >
        {paperClipIcon}
        <Headline3>No meeting materials available.</Headline3>
        <Paragraph accent="neutral900">
          Nothing was shared for this event.{' '}
          <Link href={createMailTo('hub@asap.science')}>Contact ASAP</Link> if
          you have any questions.
        </Paragraph>
      </div>
    );
  }

  return (
    <Card accent="placeholder">
      <Headline2 styleAsHeading={3}>
        No additional meeting materials available for this event
      </Headline2>
      <Paragraph accent="neutral900">
        If you have any questions about this event,{' '}
        <Link href={createMailTo('hub@asap.science')}>contact ASAP</Link> to
        learn more.
      </Paragraph>
    </Card>
  );
};

export default EventMaterialUnavailable;
