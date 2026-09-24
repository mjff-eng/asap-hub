import { css } from '@emotion/react';

import { Display, Paragraph } from '../atoms';
import { rem, smallDesktopScreen } from '../pixels';
import PageInfoContainer from './PageInfoContainer';

const textStyles = css({
  maxWidth: rem(smallDesktopScreen.width),
});

const AboutPageHeader: React.FC = () => (
  <PageInfoContainer>
    <header>
      <Display styleAsHeading={2}>About ASAP</Display>
      <div css={textStyles}>
        <Paragraph accent="neutral900">
          Find out more about the ASAP team, the Hub and the Scientific Advisory
          Board.
        </Paragraph>
      </div>
    </header>
  </PageInfoContainer>
);

export default AboutPageHeader;
