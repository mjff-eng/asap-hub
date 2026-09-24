import React from 'react';
import { css } from '@emotion/react';
import { LabDataObject } from '@asap-hub/model';

import { Card, Paragraph, Button, Headline3, Ellipsis, Link } from '../atoms';
import { rem, tabletScreen } from '../pixels';

import { LabIcon } from '../icons';
import { colour } from '../colors';

type TeamLabsCardProps = {
  readonly labs: ReadonlyArray<LabDataObject>;
  readonly isTeamActive?: boolean;
};

const containerStyles = css({
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'grid',
  rowGap: '0.5rem',
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    gridTemplateColumns: '1fr 1fr',
    columnGap: rem(32),
  },
  color: colour.foreground.tertiary,
});

const itemStyles = css({
  display: 'flex',
  alignItems: 'center',
  columnGap: '0.5rem',
});

const descriptionStyles = css({
  marginTop: rem(24),
  marginBottom: rem(33),
});

const buttonWrapperStyle = css({
  display: 'flex',
  justifyContent: 'center',
  padding: `${rem(16)} 0`,
  borderTop: `1px solid ${colour.border.tertiary}`,
});

const contentStyles = css({
  padding: `${rem(24)} ${rem(24)} 2rem`,
});

const TeamLabsCard: React.FC<TeamLabsCardProps> = ({ labs, isTeamActive }) => {
  const [showMore, setShowMore] = React.useState(false);
  const displayLabs = showMore ? labs : labs.slice(0, 8);

  return (
    <Card padding={false}>
      <div css={contentStyles}>
        <Headline3>Labs</Headline3>
        <div css={descriptionStyles}>
          <Paragraph accent="tertiary">
            {isTeamActive
              ? 'View the labs within this team and connect directly with their principal investigators.'
              : 'View the labs that were part of this team.'}
          </Paragraph>
        </div>
        <ul css={containerStyles}>
          {displayLabs.map((lab) => (
            <li key={lab.id} css={itemStyles}>
              <LabIcon />
              <Ellipsis>
                {lab.labPrincipalInvestigatorId ? (
                  <Link
                    href={`/network/users/${lab.labPrincipalInvestigatorId}`}
                  >
                    {lab.name}
                  </Link>
                ) : (
                  lab.name
                )}
              </Ellipsis>
            </li>
          ))}
        </ul>
      </div>
      {!showMore && labs.length > 8 && (
        <div css={buttonWrapperStyle}>
          <Button linkStyle onClick={() => setShowMore(true)}>
            View More Labs
          </Button>
        </div>
      )}
    </Card>
  );
};

export default TeamLabsCard;
