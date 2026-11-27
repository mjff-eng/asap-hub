import { TagList } from '@asap-hub/react-components';

import { array, boolean, number } from './knobs';

export default {
  title: 'Molecules / Tag List',
};

export const Normal = () => (
  <TagList
    max={number('Maximum number of tags shown', 5)}
    enabled={boolean('Enabled', true)}
    tags={array('Tags', [
      'Neurological Diseases',
      'Clinical Neurology',
      'Adult Neurology',
      'Neuroimaging',
      'Neurologic Examination',
      'Neuroprotection',
      'Movement Disorders',
      'Neurodegenerative Diseases',
      'Neurological Diseases',
    ])}
  />
);

export const CenterContent = () => (
  <TagList
    max={number('Maximum number of tags shown', 5)}
    enabled={boolean('Enabled', true)}
    tags={array('Tags', [
      'Neurological Diseases',
      'Clinical Neurology',
      'Adult Neurology',
      'Neuroimaging',
      'Neurologic Examination',
      'Neuroprotection',
      'Movement Disorders',
      'Neurodegenerative Diseases',
      'Neurological Diseases',
    ])}
    centerContent
  />
);
