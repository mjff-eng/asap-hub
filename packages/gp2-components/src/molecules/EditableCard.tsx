import {
  Card,
  Headline3,
  Link,
  Paragraph,
  pixels,
} from '@asap-hub/react-components';

import { css } from '@emotion/react';
import { ReactNode } from 'react';
import { addIcon, editIcon } from '../icons';
import { mobileQuery } from '../layout';

type EditableCardProps = {
  title: string;
  subtitle?: ReactNode;
  edit?: boolean;
  editHref?: string;
  optional?: boolean;
  children?: ReactNode;
};
const { rem } = pixels;

const containerStyles = css({
  margin: rem(24),
  display: 'grid',
  grid: `
    "headline edit" max-content
    "content content" auto
    /auto min-content
    `,
  columnGap: rem(32),
  rowGap: rem(32),
  [mobileQuery]: {
    grid: `
    "edit" auto
    "headline" auto
    "content" auto`,
  },
});

const addIconStyles = css({
  display: 'flex',
  'svg > path': { fill: 'white' },
});

const EditableCard: React.FC<EditableCardProps> = ({
  title,
  editHref,
  subtitle,
  optional = false,
  edit = true,
  children,
}) => (
  <Card padding={false}>
    <article css={containerStyles}>
      <div css={[{ gridArea: 'headline' }]}>
        <Headline3 noMargin>{title}</Headline3>
        {subtitle && (
          <div css={css({ marginTop: rem(24) })}>
            <Paragraph noMargin accent="neutral900">
              {subtitle}
            </Paragraph>
          </div>
        )}
      </div>
      {editHref && (
        <div
          css={[
            {
              gridArea: 'edit',
              [mobileQuery]: {
                marginBottom: rem(-8),
              },
            },
          ]}
        >
          <Link
            href={editHref}
            {...(edit ? {} : optional ? {} : { primary: true })}
            buttonStyle
            noMargin
            small
            fullWidth
          >
            <span
              css={{
                display: 'inline-flex',
                gap: rem(8),
                marginLeft: rem(6),
              }}
            >
              {edit ? 'Edit' : optional ? 'Optional' : 'Add'}
              {edit ? editIcon : <span css={addIconStyles}>{addIcon}</span>}
            </span>
          </Link>
        </div>
      )}
      <div css={[{ gridArea: 'content' }]}>{children}</div>
    </article>
  </Card>
);

export default EditableCard;
