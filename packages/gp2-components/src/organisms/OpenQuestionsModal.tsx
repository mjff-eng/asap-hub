import { gp2 as gp2Model } from '@asap-hub/model';
import {
  FormSection,
  Button,
  pixels,
  TextArea,
  colors,
} from '@asap-hub/react-components';
import { css } from '@emotion/react';
import { ComponentProps, useState, Fragment } from 'react';
import { useNavigate } from 'react-router';
import { addIcon, binIcon } from '../icons';
import { mobileQuery } from '../layout';
import EditUserModal from './EditUserModal';

const { rem } = pixels;

const thinLineStyles = css({
  width: '100%',
  height: '1px',
  marginTop: rem(48),
  marginBottom: rem(48),
  borderTop: `1px solid ${colors.neutral500.rgb}`,
});

const addButtonStyles = css({
  width: 'fit-content',
  [mobileQuery]: {
    width: '100%',
  },
});

const optional = '(optional)';

type OpenQuestionsModalProps = Pick<gp2Model.UserResponse, 'questions'> &
  Pick<ComponentProps<typeof EditUserModal>, 'backHref'> & {
    onSave: (userData: gp2Model.UserPatchRequest) => Promise<void>;
  };

const OpenQuestionsModal: React.FC<OpenQuestionsModalProps> = ({
  questions,
  backHref,
  onSave,
}) => {
  const navigate = useNavigate();
  const [newQuestions, setQuestions] = useState(
    !questions.length ? [''] : questions,
  );
  const checkDirty = () => {
    if (
      !questions.length &&
      newQuestions.length === 1 &&
      newQuestions[0] === ''
    ) {
      return false;
    }
    return newQuestions.some(
      (question, index) => question !== questions[index],
    );
  };

  const onChangeValue = (index: number) => (value: string) =>
    setQuestions(
      Object.assign([], newQuestions, {
        [index]: value,
      }),
    );
  const onRemove = (index: number) => () =>
    setQuestions(newQuestions.filter((_, idx) => idx !== index));
  const onAdd = () => setQuestions([...newQuestions, '']);

  return (
    <EditUserModal
      title="Open Questions"
      description="Share the research questions that interest you and drive your work (up to five). This will give other members a good sense of the kinds of problems that you’re interested in solving."
      onSave={async () => {
        await onSave({ questions: newQuestions.filter(Boolean) });
        void navigate(backHref);
      }}
      backHref={backHref}
      dirty={checkDirty()}
    >
      {({ isSaving }) => (
        <>
          {newQuestions.map((question, index, arr) => (
            <Fragment key={`question-${index}`}>
              <FormSection
                secondaryTitle={`Question ${index + 1} ${optional}`}
                headerDecorator={
                  <Button onClick={onRemove(index)} small>
                    <span css={{ display: 'inline-flex' }}>{binIcon}</span>
                  </Button>
                }
              >
                <TextArea
                  enabled={!isSaving}
                  value={question}
                  onChange={onChangeValue(index)}
                  maxLength={250}
                  placeholder={
                    'Example: Are alpha-synuclein deposits the cause or consequence of something deeper wrong with neurons?'
                  }
                />
              </FormSection>
              {index !== arr.length - 1 && <div css={thinLineStyles} />}
            </Fragment>
          ))}
          {newQuestions.length < 5 ? (
            <div css={addButtonStyles}>
              <Button onClick={onAdd} enabled={!isSaving} small>
                <span
                  css={{
                    display: 'inline-flex',
                    gap: rem(8),
                    margin: `0 ${rem(3)}`,
                  }}
                >
                  {newQuestions.length > 0
                    ? 'Add Another Question'
                    : 'Add Open Question'}
                  {addIcon}
                </span>
              </Button>
            </div>
          ) : undefined}
        </>
      )}
    </EditUserModal>
  );
};

export default OpenQuestionsModal;
