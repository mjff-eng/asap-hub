import { css } from '@emotion/react';
import { Card, Headline2, Paragraph } from '../atoms';
import { rem } from '../pixels';

interface EventMaterialComingSoonProps {
  materialType:
    | 'Notes'
    | 'Video recording'
    | 'Presentation'
    | 'Additional meeting materials';
}
const EventMaterialComingSoon: React.FC<EventMaterialComingSoonProps> = ({
  materialType,
}) => (
  <Card>
    <Headline2 noMargin styleAsHeading={3}>
      {materialType}
    </Headline2>
    <div css={css({ marginTop: rem(24) })} />
    <Paragraph noMargin accent="tertiary">
      {materialType} for this event will be coming soon - usually within a week
      after the event. Please check back later.
    </Paragraph>
  </Card>
);

export default EventMaterialComingSoon;
