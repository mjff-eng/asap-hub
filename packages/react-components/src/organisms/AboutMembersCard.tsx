import { css } from '@emotion/react';
import { UserResponse } from '@asap-hub/model';
import { useState } from 'react';

import { Card, Headline2 } from '../atoms';
import { casTextStyles } from '../cas-tokens.generated';
import { colour } from '../colors';
import { chevronDownIcon, chevronUpIcon } from '../icons';
import AboutMember, { aboutMembersGridStyles } from '../molecules/AboutMember';
import { rem } from '../pixels';
import { textStyle } from '../text';

const MEMBERS_LIMIT = 10;

const contentStyles = css({
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

const descriptionStyles = css(
  { margin: 0, ...textStyle(casTextStyles.body.regular) },
  { color: colour.foreground.secondary },
);

const footerStyles = css({
  display: 'flex',
  justifyContent: 'center',
  padding: rem(16),
  borderTop: `1px solid ${colour.border.card.default}`,
});

const toggleStyles = css(
  {
    display: 'flex',
    alignItems: 'center',
    gap: rem(8),
    margin: 0,
    padding: 0,
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    ...textStyle(casTextStyles.button.default),
  },
  {
    color: colour.foreground.brand,
    span: {
      display: 'flex',
    },
    svg: {
      width: rem(16),
      height: rem(16),
    },
    path: {
      stroke: colour.foreground.brand,
    },
  },
);

type AboutMembersCardProps = {
  readonly title: string;
  readonly description: string;
  readonly members: ReadonlyArray<
    Pick<
      UserResponse,
      'id' | 'firstName' | 'lastName' | 'displayName' | 'avatarUrl' | 'jobTitle'
    >
  >;
};

const AboutMembersCard: React.FC<AboutMembersCardProps> = ({
  title,
  description,
  members,
}) => {
  const [expanded, setExpanded] = useState(false);
  const hiddenCount = members.length - MEMBERS_LIMIT;

  return (
    <Card shadow={false} padding={false}>
      <div css={contentStyles}>
        <div css={introStyles}>
          <Headline2 styleAsHeading={5} noMargin>
            {title}
          </Headline2>
          <p css={descriptionStyles}>{description}</p>
        </div>
        <ul css={aboutMembersGridStyles}>
          {(expanded ? members : members.slice(0, MEMBERS_LIMIT)).map(
            (member) => (
              <AboutMember
                key={member.id}
                member={member}
                secondLine={member.jobTitle}
              />
            ),
          )}
        </ul>
      </div>
      {hiddenCount > 0 && (
        <div css={footerStyles}>
          <button
            type="button"
            css={toggleStyles}
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'View Less' : `View ${hiddenCount} More`}
            <span aria-hidden="true">
              {expanded ? chevronUpIcon : chevronDownIcon}
            </span>
          </button>
        </div>
      )}
    </Card>
  );
};

export default AboutMembersCard;
