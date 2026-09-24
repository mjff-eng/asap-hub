import { OriginalGrantInfo, SupplementGrantInfo } from '@asap-hub/model';
import { css } from '@emotion/react';
import { useState } from 'react';

import { colour } from '../colors';
import { Card, Display, Link, Paragraph, TabButton } from '../atoms';
import { TabNav } from '../molecules';
import { rem } from '../pixels';

const tabsContainerStyles = css({
  display: 'flex',
  borderBottom: `1px solid ${colour.border.tertiary}`,
});

const tabContentStyles = css({
  paddingTop: rem(20),
});

const buttonContainerStyles = css({
  marginTop: rem(24),
});

type ProjectDetailOverviewProps = {
  readonly originalGrant: OriginalGrantInfo;
  readonly supplementGrant?: SupplementGrantInfo;
};

type ProjectDetailOverviewContentProps = {
  title?: string;
  description: string;
  proposalURL?: string;
};

const ProjectDetailOverviewContent: React.FC<
  ProjectDetailOverviewContentProps
> = ({ title, description, proposalURL }) => (
  <>
    <Display styleAsHeading={4}>{title}</Display>
    <Paragraph accent="neutral900">{description}</Paragraph>
    {proposalURL ? (
      <div css={buttonContainerStyles}>
        <Link
          href={`/shared-research/${proposalURL}`}
          buttonStyle
          primary
          small
        >
          Read Full Proposal
        </Link>
      </div>
    ) : null}
  </>
);

export const tabs = ['Supplement Grant', 'Original Grant'] as const;

export type Tabs = (typeof tabs)[number];

const ProjectDetailOverview: React.FC<ProjectDetailOverviewProps> = ({
  originalGrant,
  supplementGrant,
}) => {
  const [selectedTab, setSelectedTab] = useState<Tabs>('Supplement Grant');

  return (
    <Card>
      <div>
        <Display styleAsHeading={3}>Overview</Display>

        {supplementGrant?.grantTitle ? (
          <>
            <div css={tabsContainerStyles}>
              <TabNav>
                {tabs.map((tab) => (
                  <TabButton
                    key={tab}
                    active={selectedTab === tab}
                    onClick={() => {
                      setSelectedTab(tab);
                    }}
                  >
                    {tab}
                  </TabButton>
                ))}
              </TabNav>
            </div>

            <div css={tabContentStyles}>
              {selectedTab === 'Original Grant' ? (
                <ProjectDetailOverviewContent
                  description={originalGrant.originalGrant}
                  proposalURL={originalGrant.proposalId}
                />
              ) : (
                <ProjectDetailOverviewContent
                  title={supplementGrant.grantTitle}
                  description={supplementGrant.grantDescription ?? ''}
                  proposalURL={supplementGrant.grantProposalId}
                />
              )}
            </div>
          </>
        ) : (
          <div css={css({ marginTop: rem(24) })}>
            <ProjectDetailOverviewContent
              description={originalGrant.originalGrant}
              proposalURL={originalGrant.proposalId}
            />
          </div>
        )}
      </div>
    </Card>
  );
};

export default ProjectDetailOverview;
