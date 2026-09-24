import { useLayoutEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { UserAwardWithTeam } from '@asap-hub/model';

import { Button, Card, Headline2, Paragraph } from '../atoms';
import { colour, neutral900, neutral500 } from '../colors';
import { rem } from '../pixels';

export const badgesAnchorId = 'badges';

const badgeSize = 80;
const rowGap = 40;
// minimum badges shown before "View More Badges"; on mobile a row holds fewer
// than this, so show two rows there
const MIN_COLLAPSED = 4;

const containerStyles = css({
  padding: `${rem(32)} 0 0`,
});

const headerStyles = css({
  paddingInline: rem(16),
});
const listStyles = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: rem(rowGap),
  paddingInline: rem(24),
  marginBottom: rem(32),
  marginTop: 0,
  // marginBottom: rem(32),
  marginInline: 0,
  listStyle: 'none',
});

const itemStyles = css({
  width: rem(85),
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  gap: rem(12),
});

const iconStyles = css({
  width: rem(badgeSize),
  height: rem(badgeSize),
  objectFit: 'contain',
});

const teamNameStyles = css({
  color: neutral900.rgb,
  overflowWrap: 'anywhere',
});

const showMoreButtonStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  fontWeight: 'normal',
  color: colour.brand.crn[500],
  borderTop: `1px solid ${neutral500.rgb}`,
  marginTop: rem(32),
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
  marginBottom: rem(16),
});

type UserProfileBadgesProps = {
  readonly badges: UserAwardWithTeam[];
};

const UserProfileBadges: React.FC<UserProfileBadgesProps> = ({ badges }) => {
  const [showMore, setShowMore] = useState(false);
  // how many badges fit the first row; null until measured, during which every
  // badge is rendered so the measurement sees the real wrap
  const [firstRowCount, setFirstRowCount] = useState<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Count the badges that actually sit on the first row by their offsetTop,
  // rather than estimating from widths (team names vary in width). Measurement
  // must run with every badge rendered, so it is gated on firstRowCount === null.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (firstRowCount === null && list) {
      const [firstItem, ...restItems] = Array.from(
        list.children,
      ) as HTMLElement[];
      if (firstItem) {
        const topOfFirstRow = firstItem.offsetTop;
        setFirstRowCount(
          1 +
            restItems.filter((item) => item.offsetTop === topOfFirstRow).length,
        );
      }
    }
  }, [firstRowCount, badges]);

  // Re-measure on resize: drop back to "all rendered" so the next layout effect
  // recounts the first row at the new width.
  useLayoutEffect(() => {
    const remeasure = () => setFirstRowCount(null);
    window.addEventListener('resize', remeasure);
    return () => window.removeEventListener('resize', remeasure);
  }, []);

  if (badges.length === 0) {
    return null;
  }

  // Show at least MIN_COLLAPSED badges, but always fill whole rows so the
  // collapsed view never leaves an orphan on a partial last row. On wide screens
  // the first row already exceeds the minimum; on narrow ones we round the
  // minimum up to a whole number of rows (e.g. 3-per-row shows 6, not 3 + 1).
  const perRow = firstRowCount ?? badges.length;
  const collapsedCount =
    Math.ceil(Math.max(perRow, MIN_COLLAPSED) / perRow) * perRow;
  const hasMore = badges.length > collapsedCount;
  const visibleBadges =
    showMore || !hasMore ? badges : badges.slice(0, collapsedCount);

  return (
    <div id={badgesAnchorId}>
      <Card padding={false} overrideStyles={containerStyles}>
        <Headline2 styleAsHeading={3} noMargin overrideStyles={headerStyles}>
          Badges
        </Headline2>
        <Paragraph
          accent="neutral900"
          noMargin
          styles={css({ margin: `${rem(24)} ${rem(24)} ${rem(32)}` })}
        >
          Explore all badges this member has achieved.
        </Paragraph>
        <ul ref={listRef} css={listStyles}>
          {visibleBadges.map((badge, index) => (
            <li
              key={`${badge.name}-${badge.teamName}-${badge.date}-${index}`}
              css={itemStyles}
            >
              {badge.iconUrl && (
                <img css={iconStyles} src={badge.iconUrl} alt={badge.name} />
              )}
              {badge.teamName && (
                <Paragraph noMargin styles={teamNameStyles}>
                  {badge.teamName}
                </Paragraph>
              )}
            </li>
          ))}
        </ul>
        {hasMore && (
          <Button
            linkStyle
            onClick={() => setShowMore(!showMore)}
            overrideStyles={showMoreButtonStyles}
          >
            <span css={showMoreButtonTextStyles}>
              {showMore ? 'View Less Badges' : 'View More Badges'}
            </span>
          </Button>
        )}
      </Card>
    </div>
  );
};

export default UserProfileBadges;
