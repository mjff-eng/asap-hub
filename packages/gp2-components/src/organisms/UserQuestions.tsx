import { gp2 } from '@asap-hub/model';
import {
  pixels,
  UserProfilePlaceholderCard,
  colour,
} from '@asap-hub/react-components';
import { css } from '@emotion/react';
import { ComponentProps } from 'react';
import EditableCard from '../molecules/EditableCard';

const { rem } = pixels;

type UserQuestionsProps = {
  questions: gp2.UserResponse['questions'];
} & Pick<ComponentProps<typeof EditableCard>, 'editHref'>;

const rowStyles = css({
  borderBottom: `1px solid ${colour.border.tertiary}`,
  marginBottom: rem(12),
  padding: `${rem(16)} 0`,
  ':last-child': {
    borderBottom: 'none',
    marginBottom: 0,
    paddingBottom: 0,
  },
});
const UserQuestions: React.FC<UserQuestionsProps> = ({
  questions,
  editHref,
}) => (
  <EditableCard
    editHref={editHref}
    title="Open Questions"
    subtitle="This member is interested in answering the following questions
    within their work."
    edit={!!questions.length}
    optional
  >
    {editHref && !questions.length ? (
      <UserProfilePlaceholderCard>
        Share the research questions that interest you and drive your work. This
        will give other members a good sense of the kinds of problems that
        you’re interested in solving.
      </UserProfilePlaceholderCard>
    ) : (
      <>
        {questions.map((question, index) => (
          <div key={`user-question-${index}`} css={rowStyles}>
            <strong>Q:</strong> {question}
          </div>
        ))}
      </>
    )}
  </EditableCard>
);

export default UserQuestions;
