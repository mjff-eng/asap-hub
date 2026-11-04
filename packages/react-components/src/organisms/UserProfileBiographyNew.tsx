import { css } from '@emotion/react';
import { UserResponse } from '@asap-hub/model';

import { Card, Headline2, Link } from '../atoms';
import { colour } from '../colors';
import { editSquareIcon } from '../icons';
import { ExpandableText } from '../molecules';
import { rem } from '../pixels';
import {
  bodyTextStyles,
  cardContentStyles,
  cardHeaderStyles,
  cardSectionStyles,
  emptyStateTextStyles,
} from './shared-user-profile-card-styles';

const questionListStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(16),
  margin: 0,
  padding: 0,
  listStyle: 'none',
  'li + li': {
    paddingTop: rem(16),
    borderTop: `1px solid ${colour.border.tertiary}`,
  },
});

const questionStyles = css({
  margin: 0,
  color: colour.foreground.primary,
});

type Props = Pick<UserResponse, 'biography' | 'questions'> & {
  readonly editHref?: string;
};

const UserProfileBiographyNew: React.FC<Props> = ({
  biography,
  questions,
  editHref,
}) => (
  <Card padding={false} title="Biography">
    <div css={cardContentStyles}>
      <div css={cardHeaderStyles}>
        <Headline2 styleAsHeading={3} noMargin>
          Biography
        </Headline2>
        {editHref && (
          <div>
            <Link
              buttonStyle
              small
              noMargin
              href={editHref}
              label="Edit biography"
            >
              {editSquareIcon}
            </Link>
          </div>
        )}
      </div>
      {biography ? (
        <ExpandableText variant="arrow">
          <p css={bodyTextStyles}>{biography}</p>
        </ExpandableText>
      ) : (
        <p css={emptyStateTextStyles}>No biography yet.</p>
      )}
    </div>
    {questions.length > 0 && (
      <div css={[cardSectionStyles, cardContentStyles]}>
        <Headline2 styleAsHeading={3} noMargin>
          Open Questions
        </Headline2>
        <p css={bodyTextStyles}>
          This member is interested in answering the following questions within
          their work.
        </p>
        <ul css={questionListStyles}>
          {questions.map((question, index) => (
            <li key={`question-${index}`}>
              <p css={questionStyles}>
                <strong>Q:</strong> {question}
              </p>
            </li>
          ))}
        </ul>
      </div>
    )}
  </Card>
);

export default UserProfileBiographyNew;
