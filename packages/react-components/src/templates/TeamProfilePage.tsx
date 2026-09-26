import { css } from '@emotion/react';
import { ComponentProps } from 'react';

import { Link } from '../atoms';
import { colour } from '../colors';
import { crossIcon, informationIcon } from '../icons';
import { Toast } from '../organisms';
import { rem } from '../pixels';
import { getProjectRoute } from '../utils';
import PageConstraints from './PageConstraints';
import TeamProfileHeader from './TeamProfileHeader';

const projectBannerStyles = css({
  backgroundColor: colour.background.info,
  border: `1px solid ${colour.border.info}`,
  borderLeftWidth: rem(4),
  borderRadius: rem(8),
  color: colour.foreground.info,
  display: 'flex',
  alignItems: 'flex-start',
  gap: rem(12),
  padding: rem(17),
  fontSize: rem(16),
  lineHeight: rem(24),
  marginBottom: rem(26),
  marginTop: rem(-24),
  '> svg': {
    flexShrink: 0,
  },
});

const projectBannerTextStyles = css({
  flex: 1,
  margin: 0,
});

const projectBannerDismissStyles = css({
  padding: 0,
  border: 'none',
  backgroundColor: 'unset',
  cursor: 'pointer',
  display: 'flex',
  svg: {
    stroke: colour.foreground.info,
    width: rem(20),
    height: rem(20),
  },
});

type TeamProfilePageProps = ComponentProps<typeof TeamProfileHeader> & {
  children?: React.ReactNode;
  showProjectBanner?: boolean;
  onDismissProjectBanner?: () => void;
};

const TeamProfilePage: React.FC<TeamProfilePageProps> = ({
  children,
  showProjectBanner = false,
  onDismissProjectBanner,
  ...profile
}) => {
  const { linkedProjectId, projectTitle, projectType } = profile;
  const projectLink =
    linkedProjectId && projectType
      ? getProjectRoute({ projectId: linkedProjectId, projectType })
      : undefined;

  return (
    <article>
      {!!profile.inactiveSince && (
        <Toast accent="warning">
          This team is inactive and might not have all content available.
        </Toast>
      )}
      <TeamProfileHeader {...profile} />
      <PageConstraints as="main">
        {showProjectBanner && projectLink && projectTitle && (
          <section css={projectBannerStyles}>
            {informationIcon}
            <p css={projectBannerTextStyles}>
              The workspace and outputs have moved to the team&apos;s project.
              Go to <Link href={projectLink}>{projectTitle}</Link> to access
              them.
            </p>
            <button
              aria-label="Close"
              onClick={onDismissProjectBanner}
              css={projectBannerDismissStyles}
            >
              {crossIcon}
            </button>
          </section>
        )}
        {children}
      </PageConstraints>
    </article>
  );
};

export default TeamProfilePage;
