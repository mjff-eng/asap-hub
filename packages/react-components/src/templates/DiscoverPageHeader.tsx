import { discover } from '@asap-hub/routing';

import { Display, Paragraph } from '../atoms';
import { TabNav, TabLink, PageInfoContainer } from '..';

const DiscoverPageHeader: React.FC = () => (
  <header>
    <PageInfoContainer
      nav={
        <TabNav>
          <TabLink href={discover({}).guides({}).$}>Guides</TabLink>
          <TabLink href={discover({}).tutorials({}).$}>Tutorials</TabLink>
        </TabNav>
      }
    >
      <Display styleAsHeading={2}>Guides &amp; Tutorials</Display>
      <Paragraph accent="tertiary">
        Guidance and resources about ASAP’s programs and policies.
      </Paragraph>
    </PageInfoContainer>
  </header>
);

export default DiscoverPageHeader;
