import { discover } from '@asap-hub/routing';

import { Display, Paragraph } from '../atoms';
import { TabNav, TabLink, PageInfoContainer } from '..';
import { pageHeaderTextStyles } from '../layout';

const DiscoverPageHeader: React.FC = () => (
  <header>
    <PageInfoContainer
      width="content"
      nav={
        <TabNav>
          <TabLink href={discover({}).guides({}).$}>Guides</TabLink>
          <TabLink href={discover({}).tutorials({}).$}>Tutorials</TabLink>
        </TabNav>
      }
    >
      <Display>Guides &amp; Tutorials</Display>
      <Paragraph accent="tertiary" styles={pageHeaderTextStyles}>
        Guidance and resources about ASAP’s programs and policies.
      </Paragraph>
    </PageInfoContainer>
  </header>
);

export default DiscoverPageHeader;
