import { gp2 as gp2Model } from '@asap-hub/model';
import {
  Card,
  CopyButton,
  drawerQuery,
  ExternalLinkIcon,
  informationIcon,
  Link,
  mail,
  Paragraph,
  pixels,
  Subtitle,
  TabLink,
  TabNav,
  colour,
} from '@asap-hub/react-components';
import { gp2 as gp2Routing } from '@asap-hub/routing';

import { css } from '@emotion/react';
import { ComponentProps } from 'react';

import { projectsImage } from '../images';
import { detailHeaderStyles } from '../layout';
import CardWithBackground from '../molecules/CardWithBackground';
import ShareOutputButton from '../molecules/ShareOutputButton';

import ProjectSummaryFooter from './ProjectSummaryFooter';
import ProjectSummaryHeader from './ProjectSummaryHeader';

const { rem } = pixels;
const { createMailTo } = mail;

type ProjectDetailHeaderProps = ComponentProps<typeof ProjectSummaryHeader> &
  Pick<
    gp2Model.ProjectResponse,
    | 'id'
    | 'title'
    | 'startDate'
    | 'endDate'
    | 'members'
    | 'pmEmail'
    | 'opportunitiesLink'
    | 'opportunitiesAvailable'
    | 'opportunitiesLinkName'
    | 'opportunitiesShortText'
  > & {
    isProjectMember: boolean;
    isAdministrator: boolean;
    outputsTotal: number;
    upcomingTotal: number;
    pastTotal: number;
  };

const infoContainerStyles = css({
  display: 'flex',
  flexDirection: 'row',
  gap: rem(32),
  [drawerQuery]: {
    display: 'unset',
  },
});
const opportunitiesCardStyles = css({
  display: 'flex',
  gap: rem(16),
  margin: `${rem(32)} ${rem(24)}`,
});
const cardTextContainerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(4),
});

const infoIconStyles = css({
  display: 'inline-flex',
  svg: {
    stroke: 'currentcolor',
  },
});

const copyButtonStyles = css({
  backgroundColor: 'inherit',
  borderColor: colour.brand.gp2[100],
  ':hover, :focus': {
    borderColor: colour.border.brand,
  },
  path: {
    fill: colour.foreground.brand,
  },
});

const contactContainerStyles = css({
  display: 'flex',
  gap: rem(8),
  marginTop: rem(12),
});

const ProjectDetailHeader: React.FC<ProjectDetailHeaderProps> = ({
  id,
  title,
  status,
  startDate,
  endDate,
  members,
  pmEmail,
  projectProposalUrl,
  isProjectMember,
  traineeProject,
  opportunitiesAvailable,
  opportunitiesLinkName,
  opportunitiesShortText,
  opportunitiesLink,
  isAdministrator,
  outputsTotal,
  upcomingTotal,
  pastTotal,
}) => {
  const route = gp2Routing.projects({}).project({ projectId: id });
  const isExternalOpportunityLink = (link: string) =>
    new URL(link).origin !== window.location.origin;
  return (
    <header css={detailHeaderStyles}>
      {opportunitiesAvailable && pmEmail && (
        <Card accent="information" padding={false}>
          <div css={opportunitiesCardStyles}>
            <div>{informationIcon}</div>
            <div css={cardTextContainerStyles}>
              <Subtitle noMargin>Opportunities Available</Subtitle>
              <Paragraph noMargin>
                {opportunitiesShortText ??
                  'This project is currently looking for additional team members.'}
                {opportunitiesLink && (
                  <Link href={opportunitiesLink}>
                    <span
                      css={css({ display: 'inline-flex', textIndent: rem(3) })}
                    >
                      {opportunitiesLinkName ?? 'Read more'}{' '}
                      {isExternalOpportunityLink(opportunitiesLink) && (
                        <span css={infoIconStyles}>
                          <ExternalLinkIcon />
                        </span>
                      )}
                    </span>
                  </Link>
                )}
              </Paragraph>
              <div css={contactContainerStyles}>
                <span>
                  <Link
                    buttonStyle
                    small
                    noMargin
                    primary
                    href={createMailTo(pmEmail)}
                  >
                    Contact PM
                  </Link>
                </span>
                <CopyButton
                  hoverTooltipText="Copy Email"
                  clickTooltipText="Email Copied"
                  onClick={() => navigator.clipboard.writeText(pmEmail)}
                  overrideStyles={copyButtonStyles}
                />
              </div>
            </div>
          </div>
        </Card>
      )}
      <CardWithBackground image={projectsImage}>
        <ProjectSummaryHeader
          projectProposalUrl={projectProposalUrl}
          status={status}
          traineeProject={traineeProject}
          opportunitiesAvailable={opportunitiesAvailable}
        />
        <Subtitle>Project</Subtitle>
        <h2>{title}</h2>
        <div css={infoContainerStyles}>
          <ProjectSummaryFooter
            members={members}
            startDate={startDate}
            endDate={endDate}
          />
          {isAdministrator && status !== 'Completed' && (
            <div css={css({ marginLeft: 'auto' })}>
              <ShareOutputButton id={id} entityType="project" />
            </div>
          )}
        </div>
      </CardWithBackground>
      <TabNav>
        <TabLink href={route.overview({}).$}>Overview</TabLink>
        {isProjectMember && (
          <TabLink href={route.workspace({}).$}>Workspace</TabLink>
        )}
        <TabLink href={route.outputs({}).$}>
          Shared Outputs ({outputsTotal})
        </TabLink>
        <TabLink href={route.upcoming({}).$}>
          Upcoming Events ({upcomingTotal})
        </TabLink>
        <TabLink href={route.past({}).$}>Past Events ({pastTotal})</TabLink>
      </TabNav>
    </header>
  );
};
export default ProjectDetailHeader;
