import type {
  CompletedStatusOption,
  RequestedAPCCoverageOption,
} from '@asap-hub/model';
import {
  requestedAPCCoverageOptions,
  completedStatusOptions,
} from '@asap-hub/model';
import { css } from '@emotion/react';
import { DropdownButton, ExportButton, ExportTooltip } from '.';
import { dropdownChevronIcon } from '../icons';
import { rem, remUnit, tabletScreen } from '../pixels';

const countContainerStyles = css({
  display: 'flex',
  alignItems: 'center',
});

const filterContainerStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(15),
  'span + svg': {
    width: remUnit(11),
    marginRight: '10px',
  },
  button: {
    padding: `${rem(8)} ${rem(16)}`,
  },
  marginLeft: 'auto',
  '> div': {
    height: '100%',
    '> button': {
      alignItems: 'center',
    },
  },

  [`@media (max-width: ${tabletScreen.min}px)`]: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginTop: rem(24),
    width: '100%',
  },
});

const controlsContainerStyles = css({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
});

const exportControlsStyles = css({
  flexFlow: 'row-reverse',
});

const filtersWrapperStyles = css({
  display: 'flex',
  flexDirection: 'row',
  gap: rem(32),
});

const dropdownLabelStyles = css({
  marginRight: rem(8),
});

const controlsWrapperStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(24),
});

type ComplianceControlsProps = {
  completedStatus: CompletedStatusOption;
  requestedAPCCoverage: RequestedAPCCoverageOption;
  manuscriptCount: number;
  generateLink: (
    completedStatus: string,
    requestedAPCCoverage: string,
  ) => string;
  exportResults?: () => Promise<void>;
  getComplianceDataset?: () => Promise<void>;
};

const ComplianceControls = ({
  completedStatus,
  requestedAPCCoverage,
  generateLink,
  manuscriptCount,
  exportResults,
  getComplianceDataset,
}: ComplianceControlsProps) => {
  const resultsFoundText =
    manuscriptCount === 1
      ? `${manuscriptCount} result found`
      : `${manuscriptCount} results found`;

  const tooltip = (
    <ExportTooltip
      dataInTable="Download the data you can currently see in the table;"
      fullDataset="Download the data you can currently see in the table and additional data from the CMS."
    />
  );

  return (
    <div css={controlsWrapperStyles}>
      <div css={controlsContainerStyles}>
        <div css={countContainerStyles}>
          <strong>{resultsFoundText}</strong>
        </div>
        <div css={filtersWrapperStyles}>
          <div css={filterContainerStyles}>
            <strong>Completed Status:</strong>
            <DropdownButton
              noMargin
              customMenuWidth={100}
              buttonChildren={() => (
                <>
                  <span css={dropdownLabelStyles}>
                    {completedStatusOptions[completedStatus]}
                  </span>
                  {dropdownChevronIcon}
                </>
              )}
            >
              {Object.keys(completedStatusOptions).map((statusOption) => ({
                item: (
                  <>
                    {
                      completedStatusOptions[
                        statusOption as CompletedStatusOption
                      ]
                    }
                  </>
                ),
                href: generateLink(statusOption, requestedAPCCoverage),
              }))}
            </DropdownButton>
          </div>
          <div css={filterContainerStyles}>
            <strong>APC Coverage:</strong>
            <DropdownButton
              noMargin
              buttonChildren={() => (
                <>
                  <span css={dropdownLabelStyles}>
                    {requestedAPCCoverageOptions[requestedAPCCoverage]}
                  </span>
                  {dropdownChevronIcon}
                </>
              )}
              customMenuWidth={200}
            >
              {Object.keys(requestedAPCCoverageOptions).map(
                (apcCoverageOption) => ({
                  item: (
                    <>
                      {
                        requestedAPCCoverageOptions[
                          apcCoverageOption as RequestedAPCCoverageOption
                        ]
                      }
                    </>
                  ),
                  href: generateLink(completedStatus, apcCoverageOption),
                }),
              )}
            </DropdownButton>
          </div>
        </div>
      </div>
      <div css={[controlsContainerStyles, exportControlsStyles]}>
        <ExportButton
          buttons={[
            {
              buttonText: 'Data in Table',
              errorMessage:
                'There was an issue exporting to CSV. Please try again.',
              exportResults,
            },
            {
              buttonText: 'Full Dataset',
              errorMessage:
                'There was a problem trying to retrieve the file you requested. Please try again later.',
              exportResults: getComplianceDataset,
            },
          ]}
          info={tooltip}
        />
      </div>
    </div>
  );
};

export default ComplianceControls;
