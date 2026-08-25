import { css } from '@emotion/react';

import { Headline3, Paragraph } from '../atoms';
import { deskTopIcon } from '../icons';

const containerStyles = css({
  textAlign: 'center',
});

const headlineStyles = css({
  fontSize: '26px',
  margin: '16px 0',
  lineHeight: '32px',
});

const MilestonesMobilePage: React.FC = () => (
  <header css={containerStyles}>
    <div>{deskTopIcon}</div>
    <Headline3>
      <span css={headlineStyles}>
        Milestones are only available on the desktop version.
      </span>
    </Headline3>
    <Paragraph accent="neutral900">
      To access all milestones features, please use the desktop version. We
      apologize for any inconvenience this may cause.
    </Paragraph>
  </header>
);

export default MilestonesMobilePage;
