import { TutorialsResponse } from '@asap-hub/model';
import { css } from '@emotion/react';

import { Card, Divider, Headline2 } from '../atoms';
import { mobileScreen, rem } from '../pixels';

const additionalInformationListStyles = css({
  listStyle: 'none',
  margin: 0,
  padding: `${rem(6)} 0`,
});
const additionalInformationEntryStyles = css({
  display: 'flex',
  justifyContent: 'space-between',
  padding: `${rem(6)} 0`,
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    flexDirection: 'column',
  },
});
const additionalInformationValueStyles = css({
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    marginTop: rem(12),
  },
});

type TutorialCardProps = Pick<
  TutorialsResponse,
  'sharingStatus' | 'asapFunded' | 'usedInPublication'
>;

const TutorialAdditionalInformationCard: React.FC<TutorialCardProps> = ({
  sharingStatus,
  asapFunded,
  usedInPublication,
}) => (
  <Card>
    <Headline2 styleAsHeading={5} noMargin>
      Additional Information
    </Headline2>
    <ol css={additionalInformationListStyles}>
      <li css={additionalInformationEntryStyles}>
        <strong>Sharing Status</strong>
        <span css={additionalInformationValueStyles}>{sharingStatus}</span>
      </li>
      {asapFunded === undefined || (
        <>
          <Divider />
          <li css={additionalInformationEntryStyles}>
            <strong>ASAP Funded</strong>
            <span css={additionalInformationValueStyles}>
              {asapFunded ? 'Yes' : 'No'}
            </span>
          </li>
        </>
      )}
      {usedInPublication === undefined || (
        <>
          <Divider />
          <li css={additionalInformationEntryStyles}>
            <strong>Used in a Publication</strong>
            <span css={additionalInformationValueStyles}>
              {usedInPublication ? 'Yes' : 'No'}
            </span>
          </li>
        </>
      )}
    </ol>
  </Card>
);

export default TutorialAdditionalInformationCard;
