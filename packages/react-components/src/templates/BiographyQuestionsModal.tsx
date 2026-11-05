import { useState } from 'react';
import { useNavigate } from 'react-router';
import { UserPatchRequest, UserResponse } from '@asap-hub/model';
import deepEqual from 'fast-deep-equal';

import { FormSection, LabeledTextArea } from '../molecules';
import { EditUserModal } from '../organisms';

const questionFields = [
  {
    required: true,
    placeholder:
      'Example: Are alpha-synuclein deposits the cause or consequence of something deeper wrong with neurons?',
    validationMessage: 'Please add your first Open Question',
  },
  {
    required: true,
    placeholder:
      'Example: Does alpha-synuclein represent a pathologically relevant stimulator of microglial activation?',
    validationMessage: 'Please add your second Open Question',
  },
  {
    required: false,
    placeholder:
      'Example: To what extent do pre-formed fibrils (PFFs) of alpha-synuclein alter neuronal (synaptic) activity prior to neuronal loss?',
  },
  {
    required: false,
    placeholder:
      'Example: Is it possible that LRRK2 alters the expression of multiple different miRNAs in different systems?',
  },
];

type BiographyQuestionsModalProps = Pick<
  UserResponse,
  'biography' | 'questions' | 'role'
> & {
  onSave?: (data: UserPatchRequest) => void | Promise<void>;
  backHref: string;
};

const BiographyQuestionsModal: React.FC<BiographyQuestionsModalProps> = ({
  biography = '',
  questions,
  role,
  onSave,
  backHref,
}) => {
  const navigate = useNavigate();
  const [newBiography, setNewBiography] = useState(biography);
  const [newQuestions, setNewQuestions] = useState<string[]>(questions);
  const showQuestions = role !== 'Staff';

  return (
    <EditUserModal
      title="Biography"
      dirty={newBiography !== biography || !deepEqual(newQuestions, questions)}
      backHref={backHref}
      onSave={async () => {
        await onSave?.({
          biography: newBiography,
          ...(showQuestions && {
            questions: newQuestions.filter((item) => item.trim() !== ''),
          }),
        });
        void navigate(backHref);
      }}
    >
      {({ isSaving }) => (
        <>
          <FormSection>
            <LabeledTextArea
              value={newBiography}
              onChange={setNewBiography}
              enabled={!isSaving}
              required
              maxLength={1000}
              title="Biography Details"
              subtitle="(required)"
              tip="Summarize your background and highlight any past achievements. Tip: refer to yourself in the third person."
              placeholder="Example: Randy is a Professor in the Department of Molecular and Cell Biology, University of California, and an Investigator of the Howard Hughes Medical Institute. He studied the enzymology of DNA replication as a graduate student with Arthur Kornberg at Stanford University. Among his awards is the Nobel Prize in Physiology or Medicine, which he shared with James Rothman and Thomas Südhof."
              getValidationMessage={() => 'Please add your biography'}
            />
          </FormSection>
          {showQuestions && (
            <FormSection
              title="Open Questions"
              description="Share questions that drive your work or get you out of bed in the morning. Help other ASAP researchers get to know you and spark discussions and collaborations in the Network!"
            >
              {questionFields.map(
                ({ required, placeholder, validationMessage }, index) => (
                  <LabeledTextArea
                    key={`question-${index}`}
                    required={required}
                    title={`Open Question ${index + 1}`}
                    subtitle={required ? '(required)' : '(optional)'}
                    placeholder={placeholder}
                    maxLength={200}
                    enabled={!isSaving}
                    value={newQuestions[index] || ''}
                    onChange={(val) =>
                      setNewQuestions(
                        Object.assign([], newQuestions, { [index]: val }),
                      )
                    }
                    getValidationMessage={
                      validationMessage ? () => validationMessage : undefined
                    }
                  />
                ),
              )}
            </FormSection>
          )}
        </>
      )}
    </EditUserModal>
  );
};

export default BiographyQuestionsModal;
