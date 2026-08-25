import { useContext } from 'react';
import { UserResponse } from '@asap-hub/model';
import { css } from '@emotion/react';
import { UserProfileContext } from '@asap-hub/react-context';

import { Card, Headline2, Headline3, Divider, Paragraph } from '../atoms';
import UserProfilePlaceholderCard from './UserProfilePlaceholderCard';

type QuestionsSectionProps = Pick<UserResponse, 'questions'>;

const containerStyles = css({
  display: 'flex',
  flexDirection: 'column',
});

const QuestionsSection: React.FC<QuestionsSectionProps> = ({
  questions = [],
}) => {
  const { isOwnProfile } = useContext(UserProfileContext);
  return questions.length || isOwnProfile ? (
    <Card>
      <Headline2 styleAsHeading={3}>Open Questions</Headline2>
      <Paragraph accent="neutral900">
        This member is interested in answering the following questions within
        their work.
      </Paragraph>
      {questions.length ? (
        <div css={containerStyles}>
          {questions
            .flatMap((question, idx) => {
              const component = (
                <Headline3 key={`q-${idx}`} styleAsHeading={4}>
                  {question}
                </Headline3>
              );
              return [<Divider key={`sep-${idx}`} />, component];
            })
            .slice(1)}
        </div>
      ) : (
        <UserProfilePlaceholderCard title="Which burning research questions are you aiming to clarify within the Parkinson’s space?">
          Share the research questions that interest you and drive your work.
        </UserProfilePlaceholderCard>
      )}
    </Card>
  ) : null;
};

export default QuestionsSection;
