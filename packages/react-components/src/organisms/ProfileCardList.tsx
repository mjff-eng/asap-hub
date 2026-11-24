import { ReactNode } from 'react';
import { css } from '@emotion/react';

import { Link } from '../atoms';
import { rem } from '../pixels';
import { mediaBelow } from '../layout';
import { editIcon } from '../icons';

const CARDS_GAP = 32;

const containerStyles = css({
  display: 'flex',
  flexFlow: 'column',
  gap: rem(CARDS_GAP),

  [mediaBelow.laptop]: {
    marginTop: rem(CARDS_GAP), // Leave space for the first card's pencil button
    gap: rem(CARDS_GAP * 3),
  },
});

const cardStyles = css({
  ':empty': {
    display: 'none',
  },
});

const relativeAnchorStyles = css({
  position: 'relative',
});

const editButtonStyles = css({
  position: 'absolute',
  top: 0,
  left: `calc(100% + ${rem(CARDS_GAP)}  - ${rem(6.5)})`,

  [mediaBelow.laptop]: {
    top: 'unset',
    left: 'unset',
    right: 0,
    bottom: `calc(100% + ${rem(CARDS_GAP / 2)})`,
  },
});

type CardData = {
  card: ReactNode;
  editLink?: {
    href: string;
    label: string;
    enabled?: boolean;
  };
};

interface ProfileCardListProps {
  children: ReadonlyArray<CardData | boolean | null | undefined>;
}

const ProfileCardList: React.FC<ProfileCardListProps> = ({ children }) => (
  <div css={containerStyles}>
    {children
      .filter(
        (child): child is CardData => !!child && typeof child === 'object',
      )
      .map(({ card, editLink }, index) => [
        <div css={relativeAnchorStyles} key={`card-${index}`}>
          <div css={[cardStyles]}>{card}</div>
          {editLink?.href !== undefined && (
            <div key={`edit-${index}`} css={editButtonStyles}>
              <Link
                buttonStyle
                small
                primary
                href={editLink.href}
                label={editLink.label}
                enabled={editLink.enabled}
                noMargin
              >
                {editIcon}
              </Link>
            </div>
          )}
        </div>,
      ])}
  </div>
);

export default ProfileCardList;
