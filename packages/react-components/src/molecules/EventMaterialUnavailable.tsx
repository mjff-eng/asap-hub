import { css } from '@emotion/react';
import { Card, Headline2, Paragraph } from '../atoms';
import { rem } from '../pixels';

interface EventMaterialUnavailableProps {
  materialType:
    | 'Notes'
    | 'Video recording'
    | 'Presentation'
    | 'Additional meeting materials';
}

const EventMaterialUnavailable: React.FC<EventMaterialUnavailableProps> = ({
  materialType,
}) => (
  <Card>
    <Headline2 noMargin styleAsHeading={3}>
      {materialType}
    </Headline2>
    <div css={css({ marginTop: rem(24) })} />
    <Paragraph noMargin accent="tertiary">
      No {materialType.toLowerCase()} was shared for this event.
    </Paragraph>
  </Card>
);

export default EventMaterialUnavailable;
