import { css } from '@emotion/react';
import { dropdownChevronIcon } from '../icons';
import DropdownButton from './DropdownButton';
import { rem, remUnit } from '../pixels';
import { mediaBelow } from '../layout';

const containerStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(15),
  'span + svg': {
    width: remUnit(11),
    marginRight: '10px',
  },
  button: {
    padding: `${rem(8)} ${rem(16)}`,
  },

  [mediaBelow.tablet]: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginTop: rem(24),
    width: '100%',
  },
});

interface ListControlsProps {
  readonly isListView: boolean;
  readonly listViewHref: string;
  readonly cardViewHref: string;
}
const ListControls: React.FC<ListControlsProps> = ({
  isListView,
  listViewHref,
  cardViewHref,
}) => (
  <span css={containerStyles}>
    <strong>View as:</strong>
    <DropdownButton
      noMargin
      buttonChildren={() => (
        <>
          <span css={{ marginRight: rem(10) }}>
            {isListView ? 'List' : 'Card'}
          </span>
          {dropdownChevronIcon}
        </>
      )}
    >
      {{
        item: <>List</>,
        href: listViewHref,
      }}
      {{
        item: <>Card</>,
        href: cardViewHref,
      }}
    </DropdownButton>
  </span>
);

export default ListControls;
