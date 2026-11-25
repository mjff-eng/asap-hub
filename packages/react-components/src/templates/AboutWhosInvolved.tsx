import { css } from '@emotion/react';
import { DiscoverResponse } from '@asap-hub/model';

import { Link, Paragraph } from '../atoms';
import { mailToSupport } from '../mail';
import { AboutMembersCard, MeetAsapTeam } from '../organisms';
import { rem } from '../pixels';

const containerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(24),
});

type AboutWhosInvolvedProps = Pick<
  DiscoverResponse,
  'asapAreas' | 'scientificAdvisoryBoard' | 'cnsQuestMembers'
>;

const AboutWhosInvolved: React.FC<AboutWhosInvolvedProps> = ({
  asapAreas,
  scientificAdvisoryBoard,
  cnsQuestMembers,
}) => (
  <div css={containerStyles}>
    <MeetAsapTeam areas={asapAreas} />
    <AboutMembersCard
      title="Meet the Scientific Advisory Board"
      description="External scientists who advise ASAP on research strategy and priorities."
      members={scientificAdvisoryBoard}
    />
    <AboutMembersCard
      title="Meet the CNS Quest Team"
      description="CNS Quest is the wider initiative ASAP sits within, covering central nervous system conditions beyond Parkinson's."
      members={cnsQuestMembers}
    />
    <Paragraph accent="tertiary" noMargin>
      If you're facing a technical issue with the Hub, our team is happy to
      help! <Link href={mailToSupport()}>Contact tech support</Link>.
    </Paragraph>
  </div>
);

export default AboutWhosInvolved;
