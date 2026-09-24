import React from 'react';
import { css } from '@emotion/react';
import { ManuscriptStatus } from '@asap-hub/model';
import { rem } from '../pixels';
import {
  info100,
  info500,
  warning100,
  success100,
  success500,
  colour,
} from '../colors';
import { statusIcon, StatusType } from './StatusButton';
import { getReviewerStatusType } from '../utils';

type StatusBadgeProps = {
  status: ManuscriptStatus;
};

const getStatusBadgeStyles = (type: StatusType) => {
  const bgColor =
    type === 'warning'
      ? warning100.rgba
      : type === 'final'
        ? success100.rgba
        : info100.rgba;

  const textColor =
    type === 'warning'
      ? colour.utilitarian.orange[600]
      : type === 'final'
        ? success500.rgba
        : info500.rgba;

  const iconFill =
    type === 'warning' ? colour.utilitarian.orange[600] : undefined;

  return css({
    backgroundColor: bgColor,
    color: textColor,
    padding: '0em 0.7em',
    borderRadius: rem(24),
    fontSize: '0.9em',
    marginLeft: '0.1em',
    display: 'flex',
    alignItems: 'center',
    gap: `${rem(6)}`,
    '& svg': {
      width: rem(16),
      height: rem(16),
      margin: 0,
      '& > g > path': {
        fill: iconFill,
      },
    },
  });
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const type = getReviewerStatusType(status);
  return (
    <span css={getStatusBadgeStyles(type)}>
      {statusIcon(type, true)}
      {status}
    </span>
  );
};

export default StatusBadge;
