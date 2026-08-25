import React, { useState } from 'react';
import { UserProjectMembership, ProjectStatus } from '@asap-hub/model';
import { css } from '@emotion/react';

import { Card, Paragraph, Button, Headline2, Anchor, Pill } from '../atoms';
import { charcoal, neutral900, colour, neutral500 } from '../colors';
import { rem, tabletScreen } from '../pixels';
import { getProjectRoute } from '../utils';
import { getStatusPillAccent } from './ProjectCard';

const MAX_PROJECTS = 6;

const headerStyles = css({
  display: 'flex',
  flexFlow: 'column',
  gap: rem(24),
});

const minTableColumnWidth = css({ width: rem(150) });
const paddingRight24 = css({ paddingRight: rem(24) });

const tableStyles = css({
  marginTop: rem(32),
  width: '100%',
  borderCollapse: 'collapse',
  [`@media (max-width: ${tabletScreen.min - 1}px)`]: {
    display: 'none !important',
  },
});

const tableHeaderStyles = css({
  textAlign: 'left',
  fontSize: rem(17),
  fontStyle: 'normal',
  fontWeight: 700,
  lineHeight: '24px',
  letterSpacing: '0.1px',
  color: charcoal.rgb,
});

const tableHeaderAutoWidthStyles = css({
  width: '1%',
  whiteSpace: 'nowrap',
});

const tableHeaderLastColumnStyles = css({
  width: '1%',
  whiteSpace: 'nowrap',
  textAlign: 'left',
});

const tableCellStyles = css({
  padding: `${rem(16)} 0`,
  borderBottom: `1px solid ${neutral500.rgb}`,
  verticalAlign: 'top',
  wordBreak: 'break-word',
  overflowWrap: 'break-word',
  minWidth: 0,
});

const tableCellAutoWidthStyles = css({
  width: '1%',
  whiteSpace: 'nowrap',
});

const tableCellLastColumnStyles = css({
  width: '1%',
  whiteSpace: 'nowrap',
  padding: `${rem(16)} 0 ${rem(16)} 0`,
  borderBottom: `1px solid ${neutral500.rgb}`,
  verticalAlign: 'top',
});

const lastRowNoBorder = css({
  borderBottom: 'none',
});

const projectNameStyles = css({
  fontSize: rem(17),
  fontWeight: '500',
  color: colour.brand.crn[500].rgb,
  textDecoration: 'none',
  '&:hover': {
    textDecoration: 'underline',
  },
});

const typeLabelStyles = css({
  color: neutral900.rgb,
  fontSize: rem(17),
  fontWeight: 400,
  lineHeight: rem(24),
});

const showMoreButtonStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  fontWeight: 'normal',
  color: colour.brand.crn[500].rgba,
  borderTop: `1px solid ${neutral500.rgb}`,
  marginTop: rem(16),
  paddingTop: rem(16),
  textDecoration: 'none',
  ':hover': {
    textDecoration: 'none',
  },
});

const showMoreButtonTextStyles = css({
  height: rem(24),
  display: 'flex',
  alignItems: 'center',
  gap: rem(4),
});

// Mobile styles
const mobileProjectsList = css({
  marginTop: rem(32),
  display: 'none',
  flexDirection: 'column',
  [`@media (max-width: ${tabletScreen.min - 1}px)`]: {
    display: 'flex !important',
  },
});

const mobileProjectItem = css({
  display: 'flex',
  flexDirection: 'column',
  padding: `${rem(20)} 0`,
  borderBottom: `1px solid ${neutral500.rgb}`,
  gap: rem(32),
  ':last-child': {
    borderBottom: 'none',
  },
});

const mobileProjectField = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(16),
});

const mobileFieldLabel = css({
  fontSize: rem(12),
  fontWeight: 700,
  lineHeight: '16px',
  letterSpacing: '0.1px',
  color: charcoal.rgb,
  textTransform: 'uppercase',
});

const mobileFieldValue = css({
  fontSize: rem(17),
  fontWeight: 400,
  lineHeight: rem(24),
  color: neutral900.rgb,
});

const mobileProjectNameValue = css({
  fontSize: rem(17),
  fontWeight: '500',
  color: colour.brand.crn[500].rgb,
  textDecoration: 'none',
  '&:hover': {
    textDecoration: 'underline',
  },
});

type UserProjectsCardProps = {
  projects: UserProjectMembership[];
};

const UserProjectsCard: React.FC<UserProjectsCardProps> = ({ projects }) => {
  const [showMore, setShowMore] = useState(false);

  const displayProjects = showMore ? projects : projects.slice(0, MAX_PROJECTS);
  const hasMoreProjects = projects.length > MAX_PROJECTS;

  if (projects.length === 0) {
    return (
      <Card>
        <div css={headerStyles}>
          <Headline2 styleAsHeading={3} noMargin>
            Projects
          </Headline2>
          <Paragraph accent="neutral900" noMargin>
            This user is not currently assigned to any projects.
          </Paragraph>
        </div>
      </Card>
    );
  }

  return (
    <Card
      overrideStyles={css(hasMoreProjects ? { paddingBottom: rem(16) } : {})}
    >
      <div css={headerStyles}>
        <Headline2 styleAsHeading={3} noMargin>
          Projects
        </Headline2>
        <Paragraph accent="neutral900" noMargin>
          Explore all projects this user has contributed to.
        </Paragraph>
      </div>

      {/* Desktop Table View */}
      <table css={tableStyles} data-testid="projects-table">
        <thead>
          <tr>
            <th css={tableHeaderStyles}>Project Name</th>
            <th
              css={[
                tableHeaderStyles,
                tableHeaderAutoWidthStyles,
                minTableColumnWidth,
                paddingRight24,
              ]}
            >
              Type
            </th>
            <th
              css={[
                tableHeaderStyles,
                tableHeaderAutoWidthStyles,
                tableHeaderLastColumnStyles,
              ]}
            >
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {displayProjects.map((project, index) => {
            const projectRoute = getProjectRoute({
              projectId: project.id,
              projectType: project.projectType,
            });
            const isLastRow = index === displayProjects.length - 1;

            return (
              <tr key={project.id}>
                <td
                  css={[
                    tableCellStyles,
                    paddingRight24,
                    isLastRow && lastRowNoBorder,
                  ]}
                >
                  {projectRoute ? (
                    <Anchor href={projectRoute} css={projectNameStyles}>
                      {project.title}
                    </Anchor>
                  ) : (
                    <span css={projectNameStyles}>{project.title}</span>
                  )}
                </td>
                <td
                  css={[
                    tableCellStyles,
                    tableCellAutoWidthStyles,
                    minTableColumnWidth,
                    paddingRight24,
                    isLastRow && lastRowNoBorder,
                  ]}
                >
                  <span css={typeLabelStyles}>{project.projectType}</span>
                </td>
                <td
                  css={[
                    tableCellLastColumnStyles,
                    isLastRow && lastRowNoBorder,
                  ]}
                >
                  {project.status && (
                    <Pill
                      accent={getStatusPillAccent(
                        project.status as ProjectStatus,
                      )}
                      noMargin
                    >
                      {project.status}
                    </Pill>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile Card View */}
      <div css={mobileProjectsList} data-testid="projects-mobile-list">
        {displayProjects.map((project, index) => {
          const projectRoute = getProjectRoute({
            projectId: project.id,
            projectType: project.projectType,
          });
          const isLastRow = index === displayProjects.length - 1;

          return (
            <div
              key={project.id}
              css={[mobileProjectItem, isLastRow && lastRowNoBorder]}
            >
              <div css={mobileProjectField}>
                <div css={mobileFieldLabel}>Project Name</div>
                <div css={mobileFieldValue}>
                  {projectRoute ? (
                    <Anchor href={projectRoute} css={mobileProjectNameValue}>
                      {project.title}
                    </Anchor>
                  ) : (
                    <span css={mobileProjectNameValue}>{project.title}</span>
                  )}
                </div>
              </div>
              <div css={mobileProjectField}>
                <div css={mobileFieldLabel}>Type</div>
                <div css={mobileFieldValue}>{project.projectType}</div>
              </div>
              {project.status && (
                <div css={mobileProjectField}>
                  <div css={mobileFieldLabel}>Status</div>
                  <div css={mobileFieldValue}>
                    <Pill
                      accent={getStatusPillAccent(
                        project.status as ProjectStatus,
                      )}
                      noMargin
                    >
                      {project.status}
                    </Pill>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hasMoreProjects && (
        <Button
          linkStyle
          onClick={() => setShowMore(!showMore)}
          overrideStyles={showMoreButtonStyles}
        >
          <span css={showMoreButtonTextStyles}>
            {showMore ? 'Show less ↑' : 'Show more ↓'}
          </span>
        </Button>
      )}
    </Card>
  );
};

export default UserProjectsCard;
