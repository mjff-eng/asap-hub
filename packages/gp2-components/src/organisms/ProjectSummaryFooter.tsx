import { gp2 as gp2Model } from '@asap-hub/model';
import { utils, colour } from '@asap-hub/react-components';

import { format, formatDistanceStrict as formatDistance } from 'date-fns';
import { dateIcon, usersIcon } from '../icons';
import IconWithLabel from '../molecules/IconWithLabel';

const { getCounterString } = utils;

type ProjectSummaryFooterProps = Pick<
  gp2Model.ProjectResponse,
  'members' | 'startDate' | 'endDate'
>;

const ProjectSummaryFooter: React.FC<ProjectSummaryFooterProps> = ({
  members,
  startDate,
  endDate,
}) => (
  <>
    <IconWithLabel icon={usersIcon}>
      {getCounterString(members.length, 'Member')}
    </IconWithLabel>
    <IconWithLabel icon={dateIcon}>
      <span>
        {startDate ? `${format(new Date(startDate), 'MMM yyyy')}` : 'TBD'}
        {startDate && endDate ? (
          <>
            {' - '}
            {format(new Date(endDate), 'MMM yyyy')} ·{' '}
            <span css={{ color: colour.foreground.quaternary }}>
              {`(${formatDistance(new Date(startDate), new Date(endDate), {
                unit: 'month',
              })})`}
            </span>
          </>
        ) : null}
      </span>
    </IconWithLabel>
  </>
);

export default ProjectSummaryFooter;
