import { CollaboratingTeam } from '@asap-hub/model';
import { network, sharedResearch } from '@asap-hub/routing';
import { css } from '@emotion/react';
import { useState } from 'react';

import { Link, Pill } from '../atoms';
import { neutral900 } from '../colors';
import {
  article as articleIcon,
  DiscoveryTeamIcon,
  ResourceTeamIcon,
  InactiveBadgeIcon,
  chevronUpIcon,
  chevronDownIcon,
} from '../icons';
import { rem } from '../pixels';
import CollaboratingList, {
  nonMobileQuery,
  ARTICLES_BEFORE_SCROLL,
  ARTICLE_ROW_HEIGHT,
  articleTypeLabel,
  rowStyles,
  headerStyles,
  chevronStyles,
  articleRowStyles,
} from './CollaboratingList';

const headerLeftStyles = css({
  display: 'flex',
  // Mobile: team name on the first line, article count on the next.
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: rem(8),
  [nonMobileQuery]: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
});

const teamNameGroupStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: rem(8),
});

const teamNameStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: rem(6),
});

const articleCountStyles = css({
  color: neutral900.rgb,
  paddingLeft: rem(22),
  '& > [data-bullet]': {
    display: 'none',
  },
  [nonMobileQuery]: {
    paddingLeft: 0,
    '& > [data-bullet]': {
      display: 'inline',
    },
  },
});

const articlesListStyles = (count: number) =>
  css({
    listStyle: 'none',
    margin: 0,
    padding: `${rem(0)} ${rem(12)} ${rem(20)} ${rem(32)}`,
    marginRight: rem(8),
    display: 'flex',
    flexDirection: 'column',
    marginBlockStart: rem(16),
    gap: rem(16),
    ...(count > ARTICLES_BEFORE_SCROLL
      ? {
          maxHeight: rem(ARTICLES_BEFORE_SCROLL * ARTICLE_ROW_HEIGHT),
          overflowY: 'auto',
        }
      : {}),
  });

const articleTitleGroupStyles = css({
  display: 'inline-flex',
  alignItems: 'flex-start',
  gap: rem(8),
});

const teamTypeIconFor = (teamType?: string): React.FC =>
  teamType === 'Resource Team' ? ResourceTeamIcon : DiscoveryTeamIcon;

const CollaboratingTeamRow: React.FC<{ team: CollaboratingTeam }> = ({
  team,
}) => {
  const TeamTypeIcon = teamTypeIconFor(team.teamType);
  const [expanded, setExpanded] = useState(false);
  const articleCount = team.articles.length;

  const toggle = () => setExpanded((v) => !v);

  return (
    <div css={rowStyles}>
      <div
        css={headerStyles}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={
          expanded
            ? `Collapse ${team.displayName} articles`
            : `Expand ${team.displayName} articles`
        }
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
      >
        <span css={headerLeftStyles}>
          <span css={teamNameGroupStyles}>
            <span aria-hidden="true">
              <TeamTypeIcon />
            </span>
            <span css={teamNameStyles} onClick={(e) => e.stopPropagation()}>
              <Link href={network({}).teams({}).team({ teamId: team.id }).$}>
                {team.displayName}
              </Link>
              {team.inactiveSince && <InactiveBadgeIcon />}
            </span>
          </span>
          <span css={articleCountStyles}>
            <span data-bullet aria-hidden="true">
              {'• '}
            </span>
            {articleCount} {articleCount === 1 ? 'Article' : 'Articles'}
          </span>
        </span>
        <span css={chevronStyles} aria-hidden="true">
          {expanded ? chevronUpIcon : chevronDownIcon}
        </span>
      </div>
      {expanded && (
        <ul css={articlesListStyles(articleCount)}>
          {team.articles.map((article) => {
            const label = articleTypeLabel(article.type);
            return (
              <li key={article.id} css={articleRowStyles}>
                <span css={articleTitleGroupStyles}>
                  <span aria-hidden="true">{articleIcon}</span>
                  <Link
                    href={
                      sharedResearch({}).researchOutput({
                        researchOutputId: article.id,
                      }).$
                    }
                  >
                    {article.title}
                  </Link>
                </span>
                {label && (
                  <Pill noMargin accent="gray">
                    {label}
                  </Pill>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

type CollaboratingTeamsProps = {
  collaboratingTeams?: ReadonlyArray<CollaboratingTeam>;
  emptyStateMessage?: string;
};

const CollaboratingTeams: React.FC<CollaboratingTeamsProps> = ({
  collaboratingTeams,
  emptyStateMessage = 'There are no team collaborations on this project yet.',
}) => (
  <CollaboratingList
    items={collaboratingTeams}
    initialCount={10}
    emptyStateMessage={emptyStateMessage}
    renderRow={(team) => <CollaboratingTeamRow key={team.id} team={team} />}
  />
);

export default CollaboratingTeams;
