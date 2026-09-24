import { css } from '@emotion/react';
import { TeamTool } from '@asap-hub/model';

import { Card, Headline3, Paragraph, Anchor, Link, Button } from '../atoms';
import { placeholderIcon } from '../icons';
import { rem, tabletScreen } from '../pixels';
import { getIconFromUrl } from '../utils';

type ToolCardProps = Pick<TeamTool, 'description' | 'name' | 'url'> & {
  readonly editHref: string;
  readonly onDelete?: () => void;
};

const containerStyle = css({
  alignItems: 'top',
  display: 'flex',
  flexDirection: 'column',

  [`@media (min-width: ${tabletScreen.width}px)`]: {
    flexDirection: 'row',
  },

  gridColumnGap: rem(24),
});

const logoIconStyle = css({
  [`@media (min-width: ${tabletScreen.width}px)`]: {
    marginTop: '10px',
  },
});

const linksStyles = css({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  marginTop: rem(24),

  display: 'flex',
  '> *:not(:last-of-type)': {
    paddingRight: rem(24),
  },
});

const ToolCard: React.FC<ToolCardProps> = ({
  name,
  description,
  url,

  editHref,
  onDelete,
}) => (
  <Card>
    <div css={containerStyle}>
      <div css={logoIconStyle}>{getIconFromUrl(url) ?? placeholderIcon}</div>
      <div css={{ flex: 1 }}>
        <Anchor href={url}>
          <Headline3 styleAsHeading={4}>{name}</Headline3>
          <Paragraph accent="neutral900">{description}</Paragraph>
        </Anchor>
        <ol css={linksStyles}>
          <li>
            <Link href={editHref}>Edit</Link>
          </li>
          <li>
            {onDelete ? (
              <Button linkStyle onClick={onDelete}>
                Delete
              </Button>
            ) : (
              'Delete'
            )}
          </li>
        </ol>
      </div>
    </div>
  </Card>
);

export default ToolCard;
