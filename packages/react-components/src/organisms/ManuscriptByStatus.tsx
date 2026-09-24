import { manuscriptStatus, ManuscriptStatus } from '@asap-hub/model';
import { css } from '@emotion/react';

import {
  info100,
  info200,
  info500,
  StatusType,
  success100,
  success500,
  warning100,
  neutral900,
  colour,
} from '..';
import { Card, Paragraph } from '../atoms';
import { iconStyles, statusIcon } from '../molecules/StatusButton';
import { rem } from '../pixels';
import { getReviewerStatusType } from '../utils';

const cardStyles = css({
  marginTop: rem(32),
  marginBottom: rem(32),
});

const statusDescriptionStyles = css({
  fontWeight: 'bold',
  marginBottom: rem(16),
});

const manuscriptStatusContainerStyles = css({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: '16px 8px',
  justifyItems: 'start',
});

type ColorByType = Record<Exclude<StatusType, 'none'>, string>;

const getbuttonStyles = (
  type: Exclude<StatusType, 'none'>,
  isSelected: boolean,
) => {
  const backgroundColors = {
    warning: warning100.rgb,
    final: success100.rgb,
    default: info100.rgb,
    none: info100.rgb,
  };

  const borderColors: ColorByType = {
    warning: colour.utilitarian.orange[100],
    final: info200.rgb,
    default: isSelected ? info500.rgb : colour.neutral[100],
  };

  const textColors: ColorByType = {
    warning: colour.utilitarian.orange[600],
    final: success500.rgb,
    default: isSelected ? info500.rgb : neutral900.rgb,
  };

  return css({
    paddingLeft: type === 'warning' || type === 'final' ? '12px' : '16px',
    paddingRight: '16px',
    paddingTop: '8px',
    paddingBottom: '8px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',

    backgroundColor: isSelected
      ? backgroundColors[type] || backgroundColors.default
      : 'white',
    borderStyle: 'solid',
    borderWidth: '1px !important',
    borderColor: borderColors[type],
    borderRadius: '24px',
    color: textColors[type],
    gap: '4px',
  });
};

const buttonTextStyles = css({
  fontWeight: 400,
  fontSize: rem(17),
  lineHeight: rem(24),
});

type ManuscriptByStatusProps = {
  isComplianceReviewer: boolean;
  selectedStatuses: ManuscriptStatus[];
  onSelectStatus: (status: ManuscriptStatus) => void;
  shouldHideCompleteStatus: boolean;
};
const ManuscriptByStatus: React.FC<ManuscriptByStatusProps> = ({
  isComplianceReviewer,
  selectedStatuses,
  onSelectStatus,
  shouldHideCompleteStatus,
}) => {
  const manuscriptList = shouldHideCompleteStatus
    ? manuscriptStatus.filter(
        (status) => status !== 'Compliant' && status !== 'Closed (other)',
      )
    : manuscriptStatus;
  return (
    <Card overrideStyles={cardStyles}>
      <div css={statusDescriptionStyles}>
        <Paragraph>Manuscripts by status:</Paragraph>
      </div>
      <div css={manuscriptStatusContainerStyles}>
        {manuscriptList.map((status, index) => {
          const isSelected = selectedStatuses.includes(status);

          const type = getReviewerStatusType(
            status as (typeof manuscriptStatus)[number],
          );

          if (type === 'none') {
            return null;
          }

          const hasIcon = ['warning', 'final'].includes(type);

          const buttonStyles = getbuttonStyles(type, isSelected);

          return (
            <button
              key={index}
              css={buttonStyles}
              onClick={() => onSelectStatus(status)}
            >
              {hasIcon && (
                <span css={iconStyles(type, isComplianceReviewer)}>
                  {statusIcon(type, isComplianceReviewer)}
                </span>
              )}
              <span css={buttonTextStyles}>{status}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
};

export default ManuscriptByStatus;
