import { css } from '@emotion/react';
import { AsapAreaMember, AsapAreaResponse } from '@asap-hub/model';
import { network } from '@asap-hub/routing';
import { ReactNode, useMemo, useState } from 'react';

import {
  Anchor,
  Avatar,
  Card,
  CopyButton,
  Headline2,
  Headline3,
} from '../atoms';
import { casFontFamily, casTextStyles } from '../cas-tokens.generated';
import { colour } from '../colors';
import { chevronDownIcon, mailIcon } from '../icons';
import { createMailTo } from '../mail';
import { SearchField } from '../molecules';
import { rem, tabletScreen } from '../pixels';

const MEMBERS_LIMIT = 10;
const ALL_MATCHING_AREAS = 'all-matching-areas';

const mobileQuery = `@media (max-width: ${tabletScreen.max}px)`;
const desktopQuery = `@media (min-width: ${tabletScreen.max + 1}px)`;

type TextStyle = {
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly fontWeight: number;
};
const text = ({ fontSize, lineHeight, fontWeight }: TextStyle) => ({
  margin: 0,
  fontFamily: casFontFamily.body,
  fontSize: rem(fontSize),
  lineHeight: `${lineHeight}px`,
  fontWeight,
});

const buttonResetStyles = css({
  margin: 0,
  padding: 0,
  border: 'none',
  background: 'none',
  textAlign: 'left',
  cursor: 'pointer',
});

const cardStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(24),
  padding: rem(24),
});

const introStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(16),
});

const descriptionStyles = css(text(casTextStyles.body.regular), {
  color: colour.foreground.secondary,
});

const panesStyles = css({
  display: 'flex',
  border: `1px solid ${colour.border.card.default}`,
  borderRadius: rem(8),
  overflow: 'hidden',
  [mobileQuery]: {
    flexDirection: 'column',
    border: 'none',
    borderRadius: 0,
    overflow: 'visible',
  },
});

const sidebarStyles = css({
  flexShrink: 0,
  width: rem(256),
  borderRight: `1px solid ${colour.border.card.default}`,
  [mobileQuery]: {
    display: 'none',
  },
});

const areasHeadingStyles = css(text(casTextStyles.body.bold), {
  padding: `${rem(12)} ${rem(24)}`,
  color: colour.foreground.tertiary,
  borderBottom: `1px solid ${colour.border.card.default}`,
});

const areaListStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(8),
  margin: 0,
  padding: rem(16),
  listStyle: 'none',
});

const areaButtonStyles = css(
  buttonResetStyles,
  text(casTextStyles.body.medium),
  {
    boxSizing: 'border-box',
    width: '100%',
    minHeight: rem(48),
    padding: rem(12),
    borderRadius: rem(8),
    color: colour.foreground.tertiary,
    ':hover:enabled': {
      backgroundColor: colour.background.highlight,
    },
    ':disabled': {
      color: colour.foreground.disabled,
      cursor: 'default',
    },
  },
);

const selectedAreaButtonStyles = css(text(casTextStyles.body.bold), {
  backgroundColor: colour.background.active,
  color: colour.foreground.brand,
  ':hover:enabled': {
    backgroundColor: colour.background.active,
  },
});

const mobileAreasStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(16),
  paddingTop: rem(16),
  [desktopQuery]: {
    display: 'none',
  },
});

const mobileAreasHeadingStyles = css(text(casTextStyles.heading[6].semibold), {
  fontFamily: casFontFamily.heading,
  color: colour.foreground.primary,
});

const selectWrapperStyles = css({
  position: 'relative',
  svg: {
    position: 'absolute',
    right: 0,
    top: '50%',
    width: rem(20),
    height: rem(20),
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
});

const selectStyles = css(text(casTextStyles.body.bold), {
  boxSizing: 'border-box',
  width: '100%',
  padding: `${rem(12)} ${rem(32)} ${rem(12)} 0`,
  appearance: 'none',
  color: colour.foreground.primary,
  backgroundColor: colour.background.primary,
  border: 'none',
  cursor: 'pointer',
});

const mobileDividerStyles = css({
  margin: `0 ${rem(-24)}`,
  borderBottom: `1px solid ${colour.border.card.default}`,
});

const contentStyles = css({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: rem(24),
  padding: rem(24),
  [mobileQuery]: {
    padding: `${rem(24)} 0 0`,
  },
});

const areaHeaderStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(16),
});

const emailsStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(12),
});

const emailRowStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(12),
});

const emailLinkStyles = css(text(casTextStyles.button.default), {
  display: 'flex',
  alignItems: 'center',
  gap: rem(8),
  minWidth: 0,
  padding: `${rem(11)} ${rem(16)}`,
  border: `1px solid ${colour.border.button.secondary.default}`,
  borderRadius: rem(4),
  backgroundColor: colour.background.primary,
  color: colour.foreground.secondary,
  textDecoration: 'none',
  svg: {
    flexShrink: 0,
  },
});

const emailTextStyles = css({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const emailDomainStyles = css({
  color: colour.foreground.quaternary,
});

const copyButtonStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: rem(48),
  height: rem(48),
  '& > div:last-child, svg': {
    width: rem(24),
    height: rem(24),
  },
});

const membersStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(16),
});

const membersHeadingStyles = css(text(casTextStyles.body.bold), {
  color: colour.foreground.secondary,
});

const gridStyles = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  columnGap: rem(24),
  rowGap: rem(24),
  margin: 0,
  padding: `${rem(12)} 0`,
  listStyle: 'none',
  [mobileQuery]: {
    gridTemplateColumns: 'minmax(0, 1fr)',
  },
});

const memberStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(16),
});

const memberWithAreasStyles = css({
  alignItems: 'flex-start',
});

const avatarStyles = css({
  flexShrink: 0,
  width: rem(48),
  height: rem(48),
});

const memberDetailsStyles = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: rem(8),
  minWidth: 0,
});

const memberNameStyles = css(
  text({ ...casTextStyles.body.regular, fontSize: 17 }),
  {
    color: colour.foreground.brand,
    textDecoration: 'none',
    ':hover': {
      textDecoration: 'underline',
    },
  },
);

const memberAreasStyles = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: rem(8),
});

const areaPillStyles = css(
  buttonResetStyles,
  text(casTextStyles.caption.bold),
  {
    padding: `0 ${rem(8)}`,
    borderRadius: rem(12),
    backgroundColor: colour.background.highlight,
    color: colour.foreground.brand,
    whiteSpace: 'nowrap',
  },
);

const toggleStyles = css(
  buttonResetStyles,
  text(casTextStyles.button.default),
  {
    alignSelf: 'flex-start',
    color: colour.foreground.brand,
  },
);

const resultsHeadingStyles = css(text(casTextStyles.body.regular), {
  color: colour.foreground.secondary,
  strong: {
    fontWeight: casTextStyles.body.bold.fontWeight,
  },
});

const hintStyles = css(text(casTextStyles.caption.regular), {
  color: colour.foreground.quaternary,
});

const emptyStateStyles = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: rem(16),
  paddingTop: rem(16),
  textAlign: 'center',
});

const emptyStateTitleStyles = css(text(casTextStyles.heading[5].bold), {
  fontFamily: casFontFamily.heading,
  color: colour.foreground.primary,
});

type Match = {
  readonly member: AsapAreaMember;
  readonly areas: AsapAreaResponse[];
};

const matchesSearch = (member: AsapAreaMember, searchTerm: string) =>
  [member.displayName, `${member.firstName} ${member.lastName}`].some((name) =>
    name.toLowerCase().includes(searchTerm),
  );

const pluralise = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`;

const ExpandableList: React.FC<{ readonly items: ReactNode[] }> = ({
  items,
}) => {
  const [expanded, setExpanded] = useState(false);
  const hiddenCount = items.length - MEMBERS_LIMIT;

  return (
    <>
      <ul css={gridStyles}>
        {expanded ? items : items.slice(0, MEMBERS_LIMIT)}
      </ul>
      {hiddenCount > 0 && (
        <button
          type="button"
          css={toggleStyles}
          onClick={() => setExpanded(!expanded)}
        >
          {`View ${hiddenCount} ${expanded ? 'less' : 'more'}`}
        </button>
      )}
    </>
  );
};

const MemberItem: React.FC<{
  readonly member: AsapAreaMember;
  readonly areas?: AsapAreaResponse[];
  readonly onAreaClick?: (areaId: string) => void;
}> = ({ member, areas, onAreaClick }) => (
  <li css={[memberStyles, areas && memberWithAreasStyles]}>
    <div css={avatarStyles}>
      <Avatar
        firstName={member.firstName}
        lastName={member.lastName}
        imageUrl={member.avatarUrl}
      />
    </div>
    <div css={memberDetailsStyles}>
      <Anchor
        href={network({}).users({}).user({ userId: member.id }).$}
        css={memberNameStyles}
      >
        {member.displayName}
      </Anchor>
      {areas && (
        <div css={memberAreasStyles}>
          {areas.map((area) => (
            <button
              key={area.id}
              type="button"
              css={areaPillStyles}
              onClick={() => onAreaClick?.(area.id)}
            >
              {area.name}
            </button>
          ))}
        </div>
      )}
    </div>
  </li>
);

const AreaEmail: React.FC<{ readonly email: string }> = ({ email }) => {
  const atIndex = email.indexOf('@');
  return (
    <div css={emailRowStyles}>
      <a href={createMailTo(email)} css={emailLinkStyles}>
        {mailIcon}
        <span css={emailTextStyles}>
          {email.slice(0, atIndex)}
          <span css={emailDomainStyles}>{email.slice(atIndex)}</span>
        </span>
      </a>
      <CopyButton
        hoverTooltipText="Copy Email"
        clickTooltipText="Email Copied"
        onClick={() => navigator.clipboard.writeText(email)}
        overrideStyles={copyButtonStyles}
      />
    </div>
  );
};

const AreaDetail: React.FC<{ readonly area: AsapAreaResponse }> = ({
  area,
}) => (
  <>
    <div css={areaHeaderStyles}>
      <Headline3 styleAsHeading={6} noMargin>
        {area.name}
      </Headline3>
      <p css={descriptionStyles}>{area.objective}</p>
    </div>
    <div css={emailsStyles}>
      {[area.primaryEmail, area.secondaryEmail].map(
        (email) => email && <AreaEmail key={email} email={email} />,
      )}
    </div>
    <div css={membersStyles}>
      <p css={membersHeadingStyles}>
        {pluralise(area.members.length, 'Member', 'Members')}
      </p>
      <ExpandableList
        key={area.id}
        items={area.members.map((member) => (
          <MemberItem key={member.id} member={member} />
        ))}
      />
    </div>
  </>
);

const SearchResults: React.FC<{
  readonly query: string;
  readonly matches: Match[];
  readonly area?: AsapAreaResponse;
  readonly onAreaClick: (areaId: string) => void;
}> = ({ query, matches, area, onAreaClick }) =>
  matches.length ? (
    <>
      <p css={resultsHeadingStyles}>
        <strong>
          {pluralise(matches.length, 'person matches', 'people match')}
        </strong>{' '}
        “{query}”{area && ` in ${area.name}`}
      </p>
      <ExpandableList
        key={`${query}-${area?.id}`}
        items={matches.map(({ member, areas }) => (
          <MemberItem
            key={member.id}
            member={member}
            areas={areas}
            onAreaClick={onAreaClick}
          />
        ))}
      />
      <p css={hintStyles}>
        Someone in more than one area appears once here, with every area they
        belong to. Tap an area to open it.
      </p>
    </>
  ) : (
    <div css={emptyStateStyles}>
      <p css={emptyStateTitleStyles}>No results found.</p>
      <p css={descriptionStyles}>
        Please double-check your search for any typos or try a different search
        term.
      </p>
    </div>
  );

type MeetAsapTeamProps = {
  readonly areas: ReadonlyArray<AsapAreaResponse>;
};

const MeetAsapTeam: React.FC<MeetAsapTeamProps> = ({ areas }) => {
  const [query, setQuery] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState(areas[0]?.id);
  const [searchAreaId, setSearchAreaId] = useState<string>();

  const trimmedQuery = query.trim();
  const searchTerm = trimmedQuery.toLowerCase();
  const isSearching = searchTerm.length > 0;

  const { matches, matchCountByArea } = useMemo(() => {
    const matchesById = new Map<string, Match>();
    const countByArea = new Map<string, number>();
    if (searchTerm) {
      areas.forEach((area) =>
        area.members
          .filter((member) => matchesSearch(member, searchTerm))
          .forEach((member) => {
            countByArea.set(area.id, (countByArea.get(area.id) ?? 0) + 1);
            const match = matchesById.get(member.id) ?? {
              member,
              areas: [],
            };
            match.areas.push(area);
            matchesById.set(member.id, match);
          }),
      );
    }
    return {
      matches: [...matchesById.values()],
      matchCountByArea: countByArea,
    };
  }, [areas, searchTerm]);

  const selectedArea =
    areas.find((area) => area.id === selectedAreaId) ?? areas[0];

  const searchArea = isSearching
    ? areas.find(
        (area) => area.id === searchAreaId && matchCountByArea.has(area.id),
      )
    : undefined;
  const visibleMatches = searchArea
    ? matches.filter(({ areas: memberAreas }) =>
        memberAreas.includes(searchArea),
      )
    : matches;

  const openArea = (areaId: string) => {
    setSelectedAreaId(areaId);
    setSearchAreaId(isSearching ? areaId : undefined);
  };

  const showAllMatches = () => setSearchAreaId(undefined);

  const areaLabel = (area: AsapAreaResponse) => {
    if (!isSearching) {
      return `${area.name} (${area.members.length})`;
    }
    const count = matchCountByArea.get(area.id);
    return count ? `${area.name} (${count})` : area.name;
  };

  return (
    <Card padding={false} overrideStyles={cardStyles}>
      <div css={introStyles}>
        <Headline2 styleAsHeading={5} noMargin>
          Meet the ASAP team
        </Headline2>
        <p css={descriptionStyles}>
          Team ASAP is the staff who run the initiative day to day. Open an area
          to see who works in it and who to contact.
        </p>
      </div>
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Search by name"
        padding={false}
      />
      <div css={panesStyles}>
        <nav css={sidebarStyles} aria-label="Areas">
          <p css={areasHeadingStyles}>Areas</p>
          <ul css={areaListStyles}>
            {isSearching && (
              <li>
                <button
                  type="button"
                  css={[
                    areaButtonStyles,
                    !searchArea && selectedAreaButtonStyles,
                  ]}
                  aria-current={!searchArea || undefined}
                  onClick={showAllMatches}
                >
                  {`All matching areas (${matches.length})`}
                </button>
              </li>
            )}
            {areas.map((area) => {
              const isSelected = isSearching
                ? area.id === searchArea?.id
                : area.id === selectedArea?.id;
              return (
                <li key={area.id}>
                  <button
                    type="button"
                    css={[
                      areaButtonStyles,
                      isSelected && selectedAreaButtonStyles,
                    ]}
                    aria-current={isSelected || undefined}
                    disabled={isSearching && !matchCountByArea.has(area.id)}
                    onClick={() => openArea(area.id)}
                  >
                    {areaLabel(area)}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <div css={mobileAreasStyles}>
          <p css={mobileAreasHeadingStyles}>Areas</p>
          <div css={selectWrapperStyles}>
            <select
              css={selectStyles}
              aria-label="Areas"
              value={
                isSearching
                  ? searchArea?.id ?? ALL_MATCHING_AREAS
                  : selectedArea?.id
              }
              onChange={({ target: { value } }) =>
                value === ALL_MATCHING_AREAS
                  ? showAllMatches()
                  : openArea(value)
              }
            >
              {isSearching && (
                <option value={ALL_MATCHING_AREAS}>
                  {`All matching areas (${matches.length})`}
                </option>
              )}
              {areas.map((area) => (
                <option
                  key={area.id}
                  value={area.id}
                  disabled={isSearching && !matchCountByArea.has(area.id)}
                >
                  {areaLabel(area)}
                </option>
              ))}
            </select>
            {chevronDownIcon}
            <div css={mobileDividerStyles} />
          </div>
        </div>
        <div css={contentStyles}>
          {isSearching ? (
            <SearchResults
              query={trimmedQuery}
              matches={visibleMatches}
              area={searchArea}
              onAreaClick={openArea}
            />
          ) : (
            selectedArea && <AreaDetail area={selectedArea} />
          )}
        </div>
      </div>
    </Card>
  );
};

export default MeetAsapTeam;
