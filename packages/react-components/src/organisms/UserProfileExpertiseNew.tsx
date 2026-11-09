import { UserResponse } from '@asap-hub/model';

import { Card, Headline2, Link } from '../atoms';
import { editSquareIcon } from '../icons';
import { ExpandableText, TagList } from '../molecules';
import {
  bodyTextStyles,
  cardContentStyles,
  cardHeaderStyles,
  cardSectionStyles,
  emptyStateTextStyles,
} from './shared-user-profile-card-styles';

type Props = Pick<UserResponse, 'expertiseAndResourceDescription' | 'tags'> & {
  readonly editHref?: string;
};

const UserProfileExpertiseNew: React.FC<Props> = ({
  expertiseAndResourceDescription,
  tags = [],
  editHref,
}) => (
  <Card padding={false} title="Expertise and Resources">
    <div css={cardContentStyles}>
      <div css={cardHeaderStyles}>
        <Headline2 styleAsHeading={3} noMargin>
          Expertise and Resources
        </Headline2>
        {editHref && (
          <div>
            <Link
              buttonStyle
              small
              noMargin
              href={editHref}
              label="Edit expertise and resources"
            >
              {editSquareIcon}
            </Link>
          </div>
        )}
      </div>
      {expertiseAndResourceDescription ? (
        <ExpandableText variant="arrow">
          <p css={bodyTextStyles}>{expertiseAndResourceDescription}</p>
        </ExpandableText>
      ) : (
        <p css={emptyStateTextStyles}>No expertise and resources yet.</p>
      )}
    </div>
    {tags.length > 0 && (
      <div css={[cardSectionStyles, cardContentStyles]}>
        <Headline2 styleAsHeading={3} noMargin>
          Tags
        </Headline2>
        <p css={bodyTextStyles}>
          Explore keywords related to skills, techniques, resources, and tools.
        </p>
        <TagList tags={tags.map(({ name }) => name)} />
      </div>
    )}
  </Card>
);

export default UserProfileExpertiseNew;
