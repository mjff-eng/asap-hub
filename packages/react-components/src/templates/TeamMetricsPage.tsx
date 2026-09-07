import { css } from '@emotion/react';
import { ComponentProps } from 'react';

import { Headline3, Paragraph } from '../atoms';
import { rem } from '../pixels';
import {
  HubResearchOutputRow,
  HubResearchOutputsCard,
  TeamLeadershipMetrics,
} from '../organisms';

const containerStyles = css({
  marginBottom: rem(56),
});

const subtitleContainer = css({
  marginTop: rem(56),
  marginBottom: rem(24),
});

const subtitle = css({
  fontSize: rem(21),
  fontWeight: 'bold',
  lineHeight: rem(32),
});

const MetricsSubtitle = ({ children }: { children: string }) => (
  <div css={subtitleContainer}>
    <span css={subtitle}>{children}</span>
  </div>
);

type TeamMetricsPageProps = {
  readonly hubResearchOutputRows: HubResearchOutputRow[];
  readonly leadershipMetrics: ComponentProps<typeof TeamLeadershipMetrics>;
};

const TeamMetricsPage: React.FC<TeamMetricsPageProps> = ({
  hubResearchOutputRows,
  leadershipMetrics,
}) => (
  <div css={containerStyles}>
    <Headline3 noMargin>Metrics</Headline3>
    <Paragraph accent="lead">
      Explore a high-level overview of your team's activity within the
      Collaborative Research Network.
    </Paragraph>

    <MetricsSubtitle>Hub Research Outputs</MetricsSubtitle>
    <HubResearchOutputsCard rows={hubResearchOutputRows} />

    <MetricsSubtitle>Leadership</MetricsSubtitle>
    <TeamLeadershipMetrics {...leadershipMetrics} />
  </div>
);

export default TeamMetricsPage;
