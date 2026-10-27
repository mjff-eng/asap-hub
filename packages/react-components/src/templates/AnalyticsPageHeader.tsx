import { css } from '@emotion/react';
import { isEnabled } from '@asap-hub/flags';
import { analytics } from '@asap-hub/routing';
import { Button, Display, Paragraph, TabLink } from '../atoms';
import { rem, smallDesktopScreen } from '../pixels';
import TabNav from '../molecules/TabNav';
import {
  AwardsIcon,
  EngagementIcon,
  LeadershipIcon,
  OpenScienceIcon,
  OrgChartIcon,
  ProductivityIcon,
  TeamIcon,
  downloadIcon,
} from '../icons';
import PageInfoContainer from './PageInfoContainer';

const containerStyles = css({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
});

const textStyles = css({
  maxWidth: rem(smallDesktopScreen.width),
});

const buttonsStyles = css({
  alignContent: 'center',
});

type AnalyticsPageHeaderProps = {
  onExportAnalytics: () => void;
  children?: React.ReactNode;
};

const AnalyticsPageHeader: React.FC<AnalyticsPageHeaderProps> = ({
  onExportAnalytics,
}) => (
  <header>
    <PageInfoContainer
      nav={
        <TabNav>
          <TabLink
            href={analytics({}).productivity({}).$}
            Icon={ProductivityIcon}
          >
            Resource & Data Sharing
          </TabLink>
          <TabLink href={analytics({}).collaboration({}).$} Icon={TeamIcon}>
            Collaboration
          </TabLink>
          <TabLink
            href={analytics({}).leadership({}).$}
            Icon={isEnabled('AWARDS_TAB') ? OrgChartIcon : LeadershipIcon}
          >
            Leadership & Membership
          </TabLink>
          {isEnabled('AWARDS_TAB') && (
            <TabLink href={analytics({}).awards({}).$} Icon={AwardsIcon}>
              Awards
            </TabLink>
          )}
          <TabLink href={analytics({}).engagement({}).$} Icon={EngagementIcon}>
            Engagement
          </TabLink>
          <TabLink
            href={analytics({}).openScience({}).$}
            Icon={OpenScienceIcon}
          >
            Open Science
          </TabLink>
        </TabNav>
      }
    >
      <Display styleAsHeading={2}>Analytics</Display>
      <div css={containerStyles}>
        <div css={textStyles}>
          <Paragraph accent="tertiary">
            Explore dashboards related to CRN activities.
          </Paragraph>
        </div>
        <div css={buttonsStyles}>
          <Button
            onClick={onExportAnalytics}
            primary
            noMargin
            small
            overrideStyles={css({ whiteSpace: 'nowrap' })}
          >
            {downloadIcon} Multiple XLSX
          </Button>
        </div>
      </div>
    </PageInfoContainer>
  </header>
);

export default AnalyticsPageHeader;
