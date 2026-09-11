import { css } from '@emotion/react';

import { Card, Paragraph, Subtitle } from '../atoms';
import { charcoal, lead, steel } from '../colors';
import { ExpandableText, Info, TooltipInfo } from '../molecules';
import { rem, tabletScreen } from '../pixels';
import { getPerformanceMoodIcon, getPerformanceMoodLabel } from '../utils';

export type HubResearchOutputRow = {
  outputType: string;
  numberOfOutputs: number;
  publicPercentage: number | null;
};

type HubResearchOutputsCardProps = {
  rows: ReadonlyArray<HubResearchOutputRow>;
  initiallyExpanded?: boolean;
};

const PUBLIC_OUTPUTS_TOOLTIP =
  'This percentage is calculated based on the number of outputs shared (ASAP funded).';

const tableStyles = css({
  width: '100%',
  borderCollapse: 'collapse',
  'tbody tr:not(:last-child) td': {
    borderBottom: `1px solid ${steel.rgb}`,
  },
  [`@media (max-width: ${tabletScreen.min - 1}px)`]: {
    display: 'none !important',
  },
});

const headerCellStyles = css({
  textAlign: 'left',
  color: charcoal.rgb,
  fontSize: rem(17),
  fontWeight: 'bold',
  lineHeight: rem(24),
  letterSpacing: rem(0.1),
  verticalAlign: 'top',
});

const headerWithInfoStyles = css({
  display: 'inline',
});

const cellStyles = css({
  padding: `${rem(20)} 0`,
  verticalAlign: 'middle',
  color: lead.rgb,
  fontSize: rem(17),
  fontWeight: 400,
  lineHeight: rem(24),
});

const paddedCellStyles = css({
  paddingRight: rem(24),
});

const percentageCellStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(8),
});

const percentageValueStyles = css({
  width: rem(40),
  textWrap: 'nowrap',
  [`@media (max-width: ${tabletScreen.min - 1}px)`]: {
    width: 'unset',
  },
});

const detailsStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(16),
  marginTop: rem(24),
});

const detailsBlockStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(8),
});

const mobileListStyles = css({
  display: 'none',
  flexDirection: 'column',
  [`@media (max-width: ${tabletScreen.min - 1}px)`]: {
    display: 'flex',
  },
});

const mobileItemStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(32),
  padding: `${rem(32)} 0`,
  '&:first-of-type': {
    paddingTop: 0,
  },
  '&:not(:last-child)': {
    borderBottom: `1px solid ${steel.rgb}`,
  },
});

const mobileFieldStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(8),
  color: lead.rgb,
  fontSize: rem(17),
  lineHeight: rem(24),
});

const mobileLabelStyles = css({
  fontSize: rem(17),
  fontWeight: 700,
  lineHeight: rem(16),
  letterSpacing: rem(0.1),
  color: charcoal.rgb,
});

const percentageLabelContainerStyles = css({
  display: 'flex',
  marginTop: rem(4),
});

const percentageLabelStyles = css({
  display: 'flex',
  maxWidth: 'unset',
  [`@media (max-width: ${tabletScreen.min - 1}px)`]: {
    maxWidth: rem(90),
  },
});

const formatPercentage = (publicPercentage: number | null) =>
  publicPercentage === null ? 'N/A' : `${publicPercentage}%`;

const PercentageValue: React.FC<{ publicPercentage: number | null }> = ({
  publicPercentage,
}) => (
  <span css={percentageCellStyles}>
    <span css={percentageValueStyles}>
      {formatPercentage(publicPercentage)}
    </span>
    <span css={percentageLabelContainerStyles}>
      <Info
        icon={getPerformanceMoodIcon(
          publicPercentage,
          publicPercentage === null,
        )}
      >
        <span css={percentageLabelStyles}>
          {getPerformanceMoodLabel(publicPercentage, publicPercentage === null)}
        </span>
      </Info>
    </span>
  </span>
);

const HubResearchOutputsCard: React.FC<HubResearchOutputsCardProps> = ({
  rows,
}) => (
  <Card>
    <table css={tableStyles} data-testid="hub-research-outputs-table">
      <thead>
        <tr>
          <th css={[headerCellStyles, paddedCellStyles]} scope="col">
            Output Type
          </th>
          <th css={[headerCellStyles, paddedCellStyles]} scope="col">
            # Outputs
            <br />
            (ASAP-Funded)
          </th>
          <th css={headerCellStyles} scope="col">
            <span css={headerWithInfoStyles}>
              % Public Outputs
              <br />
              (ASAP-Funded)
              <TooltipInfo>{PUBLIC_OUTPUTS_TOOLTIP}</TooltipInfo>
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.outputType}>
            <td css={[cellStyles, paddedCellStyles]}>{row.outputType}</td>
            <td css={[cellStyles, paddedCellStyles]}>{row.numberOfOutputs}</td>
            <td css={cellStyles}>
              <PercentageValue publicPercentage={row.publicPercentage} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>

    <div css={mobileListStyles} data-testid="hub-research-outputs-mobile">
      {rows.map((row) => (
        <div key={row.outputType} css={mobileItemStyles}>
          <div css={mobileFieldStyles}>
            <div css={mobileLabelStyles}>Output Type</div>
            <div>{row.outputType}</div>
          </div>
          <div css={mobileFieldStyles}>
            <div css={mobileLabelStyles}># Outputs (ASAP-Funded)</div>
            <div>{row.numberOfOutputs}</div>
          </div>
          <div css={mobileFieldStyles}>
            <div css={mobileLabelStyles}>
              % Public Outputs (ASAP-Funded){' '}
              <TooltipInfo
                overrideWrapperStyles={css({
                  marginTop: rem(4),
                  paddingLeft: 0,
                })}
                overrideTooltipStyles={css({ maxWidth: rem(100) })}
              >
                {PUBLIC_OUTPUTS_TOOLTIP}
              </TooltipInfo>
            </div>
            <PercentageValue publicPercentage={row.publicPercentage} />
          </div>
        </div>
      ))}
    </div>

    <ExpandableText variant="arrow" expandOnce>
      <div css={detailsStyles}>
        <div css={detailsBlockStyles}>
          <Subtitle accent="lead" noMargin>
            ASAP Philosophy:
          </Subtitle>
          <Paragraph noMargin accent="lead">
            ASAP's goal is for all ASAP-generated CRN outputs to be well-curated
            and shared within the ASAP research community through the CRN Hub.
          </Paragraph>
        </div>
        <div css={detailsBlockStyles}>
          <Subtitle accent="lead" noMargin>
            Metric Definition:
          </Subtitle>
          <Paragraph noMargin accent="lead">
            The Hub Research Outputs Metric provides a high-level overview of
            ASAP-funded outputs that are listed on the Hub, along with their
            public sharing status. Please note that this metric reflects only
            what is curated on the Hub as a shared research output. The metric
            is not reflective of outputs that are identified as part of an Open
            Science compliance review.
          </Paragraph>
        </div>
        <Paragraph noMargin accent="lead">
          As a reminder, ASAP requires that all ASAP-funded outputs be included
          on the Hub by the time of final publication. While it is possible for
          the values to differ between the Hub Research Outputs metrics and Open
          Science metrics, we expect any discrepancy between public outputs to
          be minimal. If you notice a large disparity between the public outputs
          as described in the Hub Output Metrics and the Open Science Metrics,
          please confirm that the Hub Outputs are accurate.
        </Paragraph>
      </div>
    </ExpandableText>
  </Card>
);

export default HubResearchOutputsCard;
