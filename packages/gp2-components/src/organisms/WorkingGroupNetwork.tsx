import { gp2 } from '@asap-hub/model';
import { Paragraph, pixels, Subtitle } from '@asap-hub/react-components';
import { css } from '@emotion/react';
import WorkingGroupCard from './WorkingGroupCard';

export type WorkingGroupsNetworkProps = {
  workingGroupNetwork: gp2.ListWorkingGroupNetworkResponse;
  role: gp2.WorkingGroupNetworkRole;
};

const { rem } = pixels;
const styles = css({
  marginTop: rem(48),
});

const container = css({
  marginTop: rem(24),
  '& > *': {
    marginBottom: rem(32),
  },
});
const WorkingGroupNetwork: React.FC<WorkingGroupsNetworkProps> = ({
  role,
  workingGroupNetwork,
}) => {
  const complexDiseaseWorkingGroups = workingGroupNetwork.items
    .filter((network) => network.role === role)
    .flatMap(({ workingGroups }) => workingGroups);

  const descriptions: Record<
    gp2.WorkingGroupNetworkRole,
    { subtitle: string; paragraph: string }
  > = {
    operational: {
      subtitle: 'Operational Working Groups',
      paragraph:
        'Manage the day to day workings of the GP2 working group structure.',
    },
    monogenic: {
      subtitle: 'Monogenic Working Groups',
      paragraph:
        'One of the two clusters of GP2 working groups focusing on data collection and analysis.',
    },
    complexDisease: {
      subtitle: 'Complex Disease Working Groups',
      paragraph:
        'One of the two clusters of GP2 working groups focusing on data collection and analysis.',
    },
    support: {
      subtitle: 'Support Working Groups',
      paragraph:
        'Provide additional support and assistance to other GP2 working groups.',
    },
  };

  return (
    <div css={styles}>
      <Subtitle noMargin>{descriptions[role].subtitle}</Subtitle>
      <Paragraph noMargin accent="neutral900">
        {descriptions[role].paragraph}
      </Paragraph>
      <article css={container}>
        {complexDiseaseWorkingGroups.map((workingGroup) => (
          <WorkingGroupCard key={workingGroup.id} {...workingGroup} />
        ))}
      </article>
    </div>
  );
};

export default WorkingGroupNetwork;
