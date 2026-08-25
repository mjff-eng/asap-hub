import { css } from '@emotion/react';
import { CalendarLink, Paragraph } from '@asap-hub/react-components';

type EventsProps = {
  readonly calendarId: string;
  readonly paragraph: string;
};

const buttonStyles = css({
  width: 'fit-content',
});

const Events: React.FC<EventsProps> = ({ calendarId, paragraph }) => (
  <>
    <Paragraph accent="neutral900">{paragraph}</Paragraph>
    <div css={buttonStyles}>
      <CalendarLink id={calendarId}>Subscribe to Calendar</CalendarLink>
    </div>
  </>
);

export default Events;
