import { ComponentProps, useState } from 'react';
import { StaticRouter } from 'react-router';
import {
  WorkingGroupAbout,
  WorkingGroupPage,
} from '@asap-hub/react-components';
import {
  createWorkingGroupMembers,
  createDeliverables,
  createWorkingGroupLeaders,
} from '@asap-hub/fixtures';
import { network } from '@asap-hub/routing';

import { boolean, select, number, text, array } from './knobs';
import { LayoutDecorator } from './layout';

export default {
  title: 'Templates / Working Group / Page',
  decorators: [LayoutDecorator],
};

export const Normal = () => {
  const [membersListElementId] = useState('wg-members');

  const activeTab = select('Active Tab', { about: 'about' }, 'about');
  const routes = {
    about: network({})
      .workingGroups({})
      .workingGroup({ workingGroupId: 'id' })
      .about({}).$,
  };

  const props: ComponentProps<typeof WorkingGroupPage> &
    ComponentProps<typeof WorkingGroupAbout> = {
    membersListElementId,
    id: 'id',
    pointOfContact: undefined,
    showCollaborationCard: true,
    title: text('Working Group name', 'Working group name'),
    description: text('Description', 'A description about the working group.'),
    deliverables: createDeliverables(number('Deliverables', 4)),
    members: createWorkingGroupMembers(number('Number of members', 6)),
    leaders: createWorkingGroupLeaders(number('Number of leaders', 6)),
    complete: boolean('Complete', false),
    externalLink: text('External link', 'link//'),
    lastModifiedDate: new Date(
      text('Last updated', '2022-01-01'),
    ).toISOString(),
    tags: array('Tags', [
      'Neurological Diseases',
      'Clinical Neurology',
      'Adult Neurology',
      'Neuroimaging',
    ]),
    calendars: [
      {
        id: 'hub@asap.science',
        color: '#B1365F',
        name: 'ASAP Hub',
        interestGroups: [],
        workingGroups: [],
        crnCalendar: false,
        seminarSeries: false,
      },
    ],
  };

  return (
    <StaticRouter key={activeTab} location={routes[activeTab]}>
      <WorkingGroupPage {...props}>
        <WorkingGroupAbout {...props} />
      </WorkingGroupPage>
    </StaticRouter>
  );
};
