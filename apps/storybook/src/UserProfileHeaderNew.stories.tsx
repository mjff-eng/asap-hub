import { ComponentProps } from 'react';
import { StaticRouter } from 'react-router';
import { UserProfileHeaderNew } from '@asap-hub/react-components';
import { network } from '@asap-hub/routing';

import { UserProfileDecorator } from './user-profile';

export default {
  title: 'Templates / User Profile / Header New',
  decorators: [UserProfileDecorator],
};

type Props = ComponentProps<typeof UserProfileHeaderNew>;

const baseProps: Props = {
  id: 'u42',
  lastModifiedDate: new Date().toISOString(),
  fullDisplayName: 'Phillip Mars',
  institution: 'Yale University',
  firstName: 'Phillip',
  lastName: 'Mars',
  email: 'me@example.com',
  degree: 'PhD',
  contactEmail: 'contact@example.com',
  country: 'USA',
  stateOrProvince: 'Connecticut',
  city: 'New Haven',
  upcomingEventsCount: 1,
  pastEventsCount: 1,
  sharedOutputsCount: 3,
  teams: [{ id: 't42', role: 'Researcher', displayName: 'Ferguson, M' }],
  jobTitle: 'Assistant Professor',
  avatarUrl: undefined,
  role: 'Grantee',
  social: {
    twitter: '123',
    github: '123',
    googleScholar: '123',
    linkedIn: '123',
    orcid: '123',
    researchGate: '123',
    researcherId: '123',
    blueSky: '123',
  },
  labs: [{ id: 'cd7be4904', name: 'Manchester' }],
};

const render = (props: Props) => {
  const tabRoutes = network({}).users({}).user({ userId: props.id });
  return (
    <StaticRouter location={tabRoutes.research({}).$}>
      <UserProfileHeaderNew {...props} />
    </StaticRouter>
  );
};

export const Normal = () => render(baseProps);

export const Editable = () =>
  render({
    ...baseProps,
    editPersonalInfoHref: '/wrong',
    editContactInfoHref: '/wrong',
    onImageSelect: () => {},
  });

export const Alumni = () =>
  render({
    ...baseProps,
    alumniSinceDate: new Date('2022-09-12').toISOString(),
    alumniLocation: 'Yale University',
  });

export const NoTeamAffiliation = () =>
  render({ ...baseProps, teams: [], labs: [] });
