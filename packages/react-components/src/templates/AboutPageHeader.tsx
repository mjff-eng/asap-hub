import { css } from '@emotion/react';
import { isEnabled } from '@asap-hub/flags';
import { about } from '@asap-hub/routing';

import { Display, Paragraph, TabLink } from '../atoms';
import TabNav from '../molecules/TabNav';
import { rem, smallDesktopScreen } from '../pixels';
import PageInfoContainer from './PageInfoContainer';

const textStyles = css({
  maxWidth: rem(smallDesktopScreen.width),
});

const AboutPageHeader: React.FC = () => {
  const showTabs = isEnabled('ABOUT_ASAP_TABS');
  return (
    <PageInfoContainer
      nav={
        showTabs && (
          <TabNav>
            <TabLink href={about({}).initiative({}).$}>The initiative</TabLink>
            <TabLink href={about({}).whosInvolved({}).$}>
              Who's involved
            </TabLink>
          </TabNav>
        )
      }
    >
      <header>
        <Display>About ASAP</Display>
        <div css={textStyles}>
          <Paragraph accent="tertiary">
            {showTabs
              ? 'Background on the initiative, its structure, and the teams behind it.'
              : 'Find out more about the ASAP team, the Hub and the Scientific Advisory Board.'}
          </Paragraph>
        </div>
      </header>
    </PageInfoContainer>
  );
};

export default AboutPageHeader;
