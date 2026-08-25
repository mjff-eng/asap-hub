import { css } from '@emotion/react';

import { EventResponse } from '@asap-hub/model';
import { Card, Headline2, Headline3 } from '../atoms';
import { rem, tabletScreen } from '../pixels';
import { neutral500 } from '../colors';
import { ExternalLink } from '../molecules';

const orderList = css({
  listStyle: 'none',
  paddingLeft: 0,
  marginBottom: 0,
  '&> li + li': {
    borderTop: `1px solid ${neutral500.rgb}`,
    marginTop: rem(12),
    paddingTop: rem(6),
    [`@media (min-width: ${tabletScreen.min}px)`]: {
      marginTop: '0',
      paddingTop: '0',
    },
  },
});

const listElement = css({
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',
});

type AdditionalMaterialsProps = {
  meetingMaterials: EventResponse['meetingMaterials'];
};
const AdditionalMaterials: React.FC<AdditionalMaterialsProps> = ({
  meetingMaterials,
}) =>
  meetingMaterials && meetingMaterials.length ? (
    <Card>
      <Headline2 styleAsHeading={3}>Additional meeting materials</Headline2>
      <ul css={orderList}>
        {meetingMaterials.map(({ title, url }, index) => (
          <li key={`material-${index}`} css={listElement}>
            <Headline3 styleAsHeading={5}>{title}</Headline3>
            <ExternalLink href={url} />
          </li>
        ))}
      </ul>
    </Card>
  ) : null;

export default AdditionalMaterials;
