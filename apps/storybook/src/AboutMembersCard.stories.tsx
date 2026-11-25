import { createUserResponse } from '@asap-hub/fixtures';
import { AboutMembersCard } from '@asap-hub/react-components';
import { number } from './knobs';

export default {
  title: 'Organisms / About / Members Card',
  component: AboutMembersCard,
};

export const Normal = () => (
  <AboutMembersCard
    title="Meet the CNS Quest Team"
    description="CNS Quest is the wider initiative ASAP sits within, covering central nervous system conditions beyond Parkinson's."
    members={Array.from({ length: number('Members', 14) }, (_, index) => ({
      ...createUserResponse({}, index),
      jobTitle: 'Research Scientist',
    }))}
  />
);
