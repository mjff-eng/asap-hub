import { css } from '@emotion/react';
import { ProjectType, ResearchOutputResponse } from '@asap-hub/model';
import { network, sharedResearch } from '@asap-hub/routing';

import {
  Anchor,
  Avatar,
  Caption,
  Headline2,
  Link,
  Pill,
  StateTag,
} from '../atoms';
import ExternalLink from './ExternalLink';
import LinkHeadline from './LinkHeadline';
import PillList from './PillList';
import TagList from './TagList';
import { formatDate } from '../date';
import { colour } from '../colors';
import { mobileScreen, rem } from '../pixels';
import {
  alumniBadgeIcon,
  DiscoveryProjectIcon,
  ResourceProjectIcon,
  TeamIcon,
  TraineeProjectIcon,
} from '../icons';
import { utils } from '..';

const TEAM_ICON = <TeamIcon />;

const PROJECT_ICONS: Record<ProjectType, React.ReactElement> = {
  'Discovery Project': <DiscoveryProjectIcon />,
  'Resource Project': <ResourceProjectIcon />,
  'Trainee Project': <TraineeProjectIcon />,
};

export type ProjectOutput = Pick<
  ResearchOutputResponse,
  | 'published'
  | 'addedDate'
  | 'authors'
  | 'created'
  | 'documentType'
  | 'id'
  | 'link'
  | 'teams'
  | 'title'
  | 'type'
  | 'isInReview'
  | 'keywords'
> & {
  project?: {
    id: string;
    title: string;
    projectType: ProjectType;
    href?: string;
  };
  lastModifiedDate?: string;
  source?: 'team' | 'project';
};

const mobileOnlyStyles = css({
  display: 'none',
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    display: 'flex',
  },
});

const mobilePillStyles = css({
  '& > span': {
    margin: 0,
  },
});

const mobilePillListStyles = css({
  '& > ul': {
    marginTop: rem(8),
    marginBottom: 0,
  },
});

const desktopOnlyStyles = css({
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    display: 'none',
  },
});

const associationStyles = css({
  display: 'flex',
  flexDirection: 'column',
  rowGap: rem(16),
  marginTop: rem(16),
});

const metadataRowStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  columnGap: rem(12),
  height: rem(32),
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    height: 'auto',
    flexWrap: 'wrap',
  },
});

const externalLinkWrapperStyles = css({
  display: 'flex',
  alignItems: 'center',
  height: rem(32),
  '& > div': {
    height: '100%',
  },
  '& a': {
    display: 'flex',
    alignItems: 'center',
    height: '100%',
  },
  '& a > span': {
    height: '100%',
    boxSizing: 'border-box',
  },
});

const associationRowStyles = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  columnGap: rem(8),
  rowGap: rem(8),
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    rowGap: rem(16),
  },
});

const associationIconStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  height: rem(24),
});

const associationItemStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  columnGap: rem(8),
});

const associationBulletStyles = css({
  marginLeft: rem(8),
});

const counterBaseStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  columnGap: rem(8),
});

const associationCounterStyles = css(counterBaseStyles, {
  marginLeft: rem(32),
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    marginLeft: 0,
    flexBasis: '100%',
  },
});

const counterAvatarStyles = css({
  width: rem(24),
  flex: 'none',
  '& > p': {
    margin: 0,
  },
});

const titleStyles = css({
  display: 'flex',
  columnGap: rem(15),
  flexWrap: 'wrap',
  alignItems: 'center',
  marginTop: rem(4),
  marginBottom: rem(4),
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    marginTop: 0,
    marginBottom: rem(16),
  },
});

const tagContainerStyles = css({
  marginTop: rem(24),
});

const datesStyles = css({
  display: 'flex',
  flexWrap: 'wrap',
  columnGap: rem(12),
  marginTop: rem(24),
  color: colour.foreground.quaternary,
  '& > *, & p': {
    lineHeight: rem(16),
  },
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    flexDirection: 'column',
  },
});

const dateSeparatorStyles = css({
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    display: 'none',
  },
});

const dateAddedStyles = css({
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    '& > p::after': {
      content: '"  •"',
    },
  },
});

const authorRowStyles = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  columnGap: rem(40),
  rowGap: rem(8),
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    rowGap: rem(16),
  },
});

const authorItemStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  columnGap: rem(8),
  '& > div:first-of-type': {
    width: rem(24),
    height: rem(24),
    flex: 'none',
    margin: 0,
    '& > p': {
      margin: 0,
    },
  },
});

type AuthorRowProps = {
  authors: ProjectOutput['authors'];
  max: number;
};

const AuthorRow: React.FC<AuthorRowProps> = ({ authors, max }) => {
  const visible = authors.slice(0, max);
  const remaining = authors.length - visible.length;
  return (
    <div css={authorRowStyles}>
      {visible.map((author, index) => {
        const isInternal = 'firstName' in author;
        return (
          <span
            key={isInternal ? author.id : `ext-${index}`}
            css={authorItemStyles}
          >
            <Avatar
              firstName={isInternal ? author.firstName : undefined}
              lastName={isInternal ? author.lastName : undefined}
              imageUrl={isInternal ? author.avatarUrl : undefined}
            />
            {isInternal ? (
              <Link href={network({}).users({}).user({ userId: author.id }).$}>
                {author.displayName}
              </Link>
            ) : (
              author.displayName
            )}
            {isInternal && author.alumniSinceDate && (
              <span css={{ display: 'inline-flex' }}>{alumniBadgeIcon}</span>
            )}
          </span>
        );
      })}
      {remaining > 0 && (
        <span css={counterBaseStyles}>
          <span css={counterAvatarStyles}>
            <Avatar placeholder={`+${remaining}`} />
          </span>
          <span>Authors</span>
        </span>
      )}
    </div>
  );
};

type AssociationRowProps = {
  icon: React.ReactNode;
  items: ReadonlyArray<{ id: string; displayName: string; href?: string }>;
  max: number;
  label: 'Projects' | 'Teams';
  separator?: string;
};

const AssociationRow: React.FC<AssociationRowProps> = ({
  icon,
  items,
  max,
  label,
  separator,
}) => {
  const visible = items.slice(0, max);
  const remaining = items.length - visible.length;
  return (
    <div css={associationRowStyles}>
      <span css={associationIconStyles}>{icon}</span>
      {visible.map((item, index) => (
        <span key={item.id} css={associationItemStyles}>
          {item.href ? (
            <Link href={item.href}>{item.displayName}</Link>
          ) : (
            item.displayName
          )}
          {separator && index < visible.length - 1 && (
            <span css={associationBulletStyles}>{separator}</span>
          )}
        </span>
      ))}
      {remaining > 0 && (
        <span css={associationCounterStyles}>
          <span css={counterAvatarStyles}>
            <Avatar placeholder={`+${remaining}`} />
          </span>
          <span>{label}</span>
        </span>
      )}
    </div>
  );
};

type ProjectOutputBodyProps = ProjectOutput & {
  variant: 'card' | 'list';
  showTags?: boolean;
};

const ProjectOutputBody: React.FC<ProjectOutputBodyProps> = ({
  id: researchOutputId,
  variant,
  source = 'project',
  created,
  addedDate,
  lastModifiedDate,
  teams,
  title,
  authors,
  type,
  documentType,
  link,
  published,
  isInReview,
  keywords,
  showTags = true,
  project,
}) => {
  const firstTeam = teams[0];

  const primaryProject =
    project ??
    (firstTeam?.project
      ? {
          id: firstTeam.project.id,
          title: firstTeam.project.title,
          projectType: firstTeam.project.projectType,
          href: utils.getProjectRoute({
            projectId: firstTeam.project.id,
            projectType: firstTeam.project.projectType,
          }),
        }
      : undefined);

  const otherProjects = (project ? teams : teams.slice(1))
    .filter((team) => !!team.project?.id)
    .map((team) => ({
      id: team.project?.id as string,
      displayName: team.project?.title as string,
      href: utils.getProjectRoute({
        projectId: team.project?.id as string,
        projectType: team.project?.projectType as ProjectType,
      }),
    }));

  const externalLinkElement = link ? (
    <div css={externalLinkWrapperStyles}>
      <ExternalLink href={link} label="Access Output" size="large" noMargin />
    </div>
  ) : null;

  return (
    <>
      <div css={[metadataRowStyles, desktopOnlyStyles]}>
        <PillList
          small
          pills={[
            'Project Output',
            ...(documentType ? [documentType] : []),
            ...(type ? [type] : []),
          ]}
        />
        {externalLinkElement}
      </div>
      <div css={[metadataRowStyles, mobileOnlyStyles, mobilePillStyles]}>
        <Pill small>Project Output</Pill>
        {externalLinkElement}
      </div>
      {(documentType || type) && (
        <div css={[mobileOnlyStyles, mobilePillListStyles]}>
          <PillList
            small
            pills={[
              ...(documentType ? [documentType] : []),
              ...(type ? [type] : []),
            ]}
          />
        </div>
      )}
      <div css={titleStyles}>
        {variant === 'card' ? (
          <LinkHeadline
            level={2}
            styleAsHeading={4}
            href={sharedResearch({}).researchOutput({ researchOutputId }).$}
          >
            {title}
          </LinkHeadline>
        ) : (
          <Anchor
            href={sharedResearch({}).researchOutput({ researchOutputId }).$}
          >
            <Headline2 styleAsHeading={5} noMargin>
              {title}
            </Headline2>
          </Anchor>
        )}
        {!published && (
          <StateTag
            label={isInReview ? 'In Review' : 'Draft'}
            accent={isInReview ? 'blue' : undefined}
          />
        )}
      </div>
      <AuthorRow authors={authors} max={3} />
      <div css={associationStyles}>
        {primaryProject && (
          <AssociationRow
            icon={PROJECT_ICONS[primaryProject.projectType]}
            max={1}
            label="Projects"
            items={[
              {
                id: primaryProject.id,
                displayName: primaryProject.title,
                href: primaryProject.href,
              },
              ...otherProjects,
            ]}
          />
        )}
        {teams.length > 0 && (
          <>
            <div css={desktopOnlyStyles}>
              <AssociationRow
                icon={TEAM_ICON}
                max={3}
                label="Teams"
                separator="•"
                items={teams.map(({ id, displayName }) => ({
                  id,
                  displayName: `Team ${displayName}`,
                  href: network({}).teams({}).team({ teamId: id }).$,
                }))}
              />
            </div>
            <div css={[associationRowStyles, mobileOnlyStyles]}>
              <span css={associationIconStyles}>{TEAM_ICON}</span>
              {teams.length > 1 ? (
                <span css={associationItemStyles}>{teams.length} Teams</span>
              ) : (
                firstTeam && (
                  <span css={associationItemStyles}>
                    <Link
                      href={
                        network({}).teams({}).team({ teamId: firstTeam.id }).$
                      }
                    >
                      Team {firstTeam.displayName}
                    </Link>
                  </span>
                )
              )}
            </div>
          </>
        )}
      </div>
      {showTags && keywords.length > 0 && (
        <div css={tagContainerStyles}>
          <TagList max={3} tags={keywords} />
        </div>
      )}
      <div css={datesStyles}>
        <span css={dateAddedStyles}>
          <Caption asParagraph noMargin>
            Date Added: {formatDate(new Date(addedDate || created))}
          </Caption>
        </span>
        <span css={dateSeparatorStyles}>•</span>
        <Caption asParagraph noMargin>
          Last Updated:{' '}
          {formatDate(new Date(lastModifiedDate || addedDate || created))}
        </Caption>
      </div>
    </>
  );
};

export default ProjectOutputBody;
