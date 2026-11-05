import { css } from '@emotion/react';
import { UserResponse } from '@asap-hub/model';

import { Card, Headline2, Link } from '../atoms';
import { colour } from '../colors';
import { editSquareIcon } from '../icons';
import { rem } from '../pixels';
import {
  bodyTextStyles,
  cardContentStyles,
  cardHeaderStyles,
  emptyStateTextStyles,
} from './shared-user-profile-card-styles';

const fieldStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(16),
});

const fieldTitleStyles = css({
  margin: 0,
  fontWeight: 'bold',
  color: colour.foreground.primary,
});

type Props = Pick<
  UserResponse,
  | 'firstName'
  | 'role'
  | 'responsibilities'
  | 'researchInterests'
  | 'reachOut'
  | 'alumniSinceDate'
> & {
  readonly editHref?: string;
};

const UserProfileRoleNew: React.FC<Props> = ({
  firstName,
  role,
  responsibilities,
  researchInterests,
  reachOut,
  alumniSinceDate,
  editHref,
}) => {
  const title = alumniSinceDate ? 'Former Role' : 'Role';
  const fields = [
    { title: 'Responsibilities', text: responsibilities },
    {
      title: 'Research Interest',
      text: role !== 'Staff' ? researchInterests : undefined,
    },
    {
      title: `Reach out to ${firstName} for help with...`,
      text: role === 'Staff' ? reachOut : undefined,
    },
  ].filter(({ text }) => text);

  return (
    <Card padding={false} title={title}>
      <div css={cardContentStyles}>
        <div css={cardHeaderStyles}>
          <Headline2 styleAsHeading={3} noMargin>
            {title}
          </Headline2>
          {editHref && (
            <div>
              <Link
                buttonStyle
                small
                noMargin
                href={editHref}
                label="Edit role"
              >
                {editSquareIcon}
              </Link>
            </div>
          )}
        </div>
        {fields.length ? (
          fields.map((field) => (
            <div key={field.title} css={fieldStyles}>
              <p css={fieldTitleStyles}>{field.title}</p>
              <p css={bodyTextStyles}>{field.text}</p>
            </div>
          ))
        ) : (
          <p css={emptyStateTextStyles}>No role details yet.</p>
        )}
      </div>
    </Card>
  );
};

export default UserProfileRoleNew;
