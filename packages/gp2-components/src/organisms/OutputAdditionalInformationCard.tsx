import { gp2 } from '@asap-hub/model';
import {
  formatDateToTimezone,
  ExternalLinkIcon,
  Card,
  Divider,
  Headline2,
  Link,
  pixels,
} from '@asap-hub/react-components';
import { css } from '@emotion/react';

const { mobileScreen, rem } = pixels;

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
const externalLinkStyle = css({
  display: 'flex',
});

type OutputAdditionalInformationCardProps = Pick<
  gp2.OutputResponse,
  | 'sharingStatus'
  | 'gp2Supported'
  | 'doi'
  | 'rrid'
  | 'accessionNumber'
  | 'publishDate'
>;

const OutputAdditionalInformationCard: React.FC<
  OutputAdditionalInformationCardProps
> = ({
  sharingStatus,
  gp2Supported,
  doi,
  rrid,
  accessionNumber,
  publishDate,
}) => (
  <Card>
    <Headline2 styleAsHeading={6}>Additional Information</Headline2>
    <ol css={additionalInformationListStyles}>
      {gp2Supported === "Don't Know" || gp2Supported === undefined || (
        <>
          <li css={additionalInformationEntryStyles}>
            <strong>GP2 Supported</strong>
            <span css={additionalInformationValueStyles}>{gp2Supported}</span>
          </li>
          <Divider />
        </>
      )}
      <li css={additionalInformationEntryStyles}>
        <strong>Sharing Status</strong>
        <span css={additionalInformationValueStyles}>{sharingStatus}</span>
      </li>
      {sharingStatus === 'GP2 Only' || publishDate === undefined || (
        <>
          <Divider />
          <li css={additionalInformationEntryStyles}>
            <strong>Public Repository Published Date</strong>
            <span css={additionalInformationValueStyles}>
              {formatDateToTimezone(
                publishDate,
                'EEE, dd MMM yyyy',
              ).toUpperCase()}
            </span>
          </li>
        </>
      )}
      {doi === undefined || (
        <>
          <Divider />
          <li css={additionalInformationEntryStyles}>
            <strong>Identifier (DOI)</strong>
            <span css={additionalInformationValueStyles}>
              <Link
                applyIconTheme
                href={new URL(`https://doi.org/${doi}`).toString()}
              >
                <div css={externalLinkStyle}>
                  <span>{doi}</span>
                  <ExternalLinkIcon />
                </div>
              </Link>
            </span>
          </li>
        </>
      )}
      {rrid === undefined || (
        <>
          <Divider />
          <li css={additionalInformationEntryStyles}>
            <strong>Identifier (RRID)</strong>
            <span css={additionalInformationValueStyles}>
              <Link
                applyIconTheme
                href={new URL(
                  `https://scicrunch.org/resolver/${rrid}`,
                ).toString()}
              >
                <div css={externalLinkStyle}>
                  <span>{rrid}</span>
                  <ExternalLinkIcon />
                </div>
              </Link>
            </span>
          </li>
        </>
      )}
      {accessionNumber === undefined || (
        <>
          <Divider />
          <li css={additionalInformationEntryStyles}>
            <strong>Identifier (Accession #)</strong>
            <span css={additionalInformationValueStyles}>
              {accessionNumber}
            </span>
          </li>
        </>
      )}
    </ol>
  </Card>
);

export default OutputAdditionalInformationCard;
