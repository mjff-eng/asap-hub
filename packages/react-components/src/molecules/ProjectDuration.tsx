import { css } from '@emotion/react';
import { ProjectStatus } from '@asap-hub/model';
import { differenceInMonths } from 'date-fns';
import { clockIcon } from '../icons';
import { rem } from '../pixels';
import { neutral800, neutral900 } from '../colors';
import { formatProjectDate } from '../date';

const metadataRowStyles = css({
  display: 'flex',
  alignItems: 'flex-start',
  gap: rem(8),
  fontSize: rem(17),
  color: neutral900.rgb,
});

const iconStyles = css({
  display: 'inline-flex',
  width: rem(24),
  height: rem(24),
  flexShrink: 0,
  '& svg': {
    width: '100%',
    height: '100%',
  },
});

const durationStyles = css({
  color: neutral800.rgb,
});

export const calculateDuration = (
  startDate: string,
  endDate: string,
): string => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Check for invalid dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 'Invalid Period';
    }

    const totalMonths = differenceInMonths(end, start);

    if (totalMonths < 12) {
      return `${totalMonths} mos`;
    }

    const years = Math.floor(totalMonths / 12);
    return years === 1 ? '1 yr' : `${years} yrs`;
  } catch {
    // istanbul ignore next - defensive error handling, already checked for invalid dates above
    return 'Invalid Period';
  }
};

type ProjectDurationProps = {
  readonly startDate: string;
  readonly endDate: string;
  readonly projectStatus: ProjectStatus;
};

const ProjectDuration: React.FC<ProjectDurationProps> = ({
  startDate,
  endDate,
  projectStatus,
}) => {
  const duration = calculateDuration(startDate, endDate);
  const showEndDateAndDuration = endDate && projectStatus !== 'Active';
  return (
    <div css={metadataRowStyles}>
      <span css={iconStyles}>{clockIcon}</span>
      <span>
        {formatProjectDate(startDate)} -{' '}
        {showEndDateAndDuration
          ? `${formatProjectDate(endDate)} • `
          : 'Present '}
        {showEndDateAndDuration && (
          <span css={durationStyles}>({duration})</span>
        )}
      </span>
    </div>
  );
};

export default ProjectDuration;
