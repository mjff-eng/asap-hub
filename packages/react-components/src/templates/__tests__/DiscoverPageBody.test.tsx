import { ComponentProps } from 'react';
import { render } from '@testing-library/react';

import DiscoverPageBody from '../DiscoverPageBody';

const props: ComponentProps<typeof DiscoverPageBody> = {
  aboutUs: '',
  members: [],
  scientificAdvisoryBoard: [],
  cnsQuestMembers: [],
  asapAreas: [],
};

it('renders help section', () => {
  const { getByText } = render(<DiscoverPageBody {...props} />);
  expect(getByText('Contact tech support')).toBeInTheDocument();
});
