/** @jsxImportSource @emotion/react */
import { useState } from 'react';
import { css } from '@emotion/react';
import { TeamTool } from '@asap-hub/model';
import { TEAM_TOOL_URL } from '@asap-hub/validation';

import { Button, Link } from '../atoms';
import { FormSection, LabeledTextField } from '../molecules';
import { noop } from '../utils';
import { EditModal } from '../organisms';
import { GlobeIcon } from '../icons';
import { rem } from '../pixels';
import { mediaFrom } from '../layout';

const buttonMediaQuery = mediaFrom.tablet;

const buttonContainerStyles = css({
  display: 'grid',
  columnGap: rem(30),
  gridTemplateRows: 'max-content 12px max-content',
  [buttonMediaQuery]: {
    gridTemplateColumns: 'max-content max-content',
    gridTemplateRows: 'auto',
    justifyContent: 'flex-end',
  },
  marginTop: rem(32),
});

const saveButtonStyles = css({
  display: 'flex',
  justifyContent: 'center',
  gridRow: '1 / span 2',
  gridColumn: '1',
  [buttonMediaQuery]: {
    gridRow: '1',
    gridColumn: '2',
  },
});

const cancelButtonStyles = css({
  display: 'flex',
  justifyContent: 'center',
  gridRow: '2 / span 2',
  gridColumn: '1',
  [buttonMediaQuery]: {
    gridRow: '1',
  },
});

type ToolModalProps = Partial<TeamTool> & {
  onSave?: (data: TeamTool) => Promise<void>;
  title: string;
  backHref: string;
  nameFirst?: boolean;
  urlTitle?: string;
  urlDescription?: string;
  descriptionDescription?: string;
  saveButtonText?: string;
};

const ToolModal: React.FC<ToolModalProps> = ({
  title,
  id,
  url = '',
  description = '',
  name = '',
  onSave = noop,
  backHref,
  nameFirst = false,
  urlTitle = 'Add URL',
  urlDescription = 'Ensure sharing settings have been adjusted so that your team can access this link.',
  descriptionDescription = 'Help your team understand what this link is used for.',
  saveButtonText,
}) => {
  const [newUrl, setNewUrl] = useState(url);
  const [newDescription, setNewDescription] = useState(description);
  const [newName, setNewName] = useState(name);

  const showBottomButtons = !!saveButtonText;

  return (
    <EditModal
      title={title}
      dirty={
        newUrl !== url || newDescription !== description || newName !== name
      }
      backHref={backHref}
      showHeadingSave={!showBottomButtons}
      disableNavigationWarning
      onSave={() =>
        onSave({
          id,
          name: newName,
          url: newUrl,
          description: newDescription,
        })
      }
    >
      {({ isSaving }, asyncFunctionWrapper) => {
        const urlField = (
          <LabeledTextField
            title={urlTitle}
            subtitle="(required)"
            description={urlDescription}
            value={newUrl}
            onChange={setNewUrl}
            enabled={!isSaving}
            pattern={TEAM_TOOL_URL.source}
            labelIndicator={<GlobeIcon />}
            getValidationMessage={() =>
              'Please enter a valid URL, starting with http:// or https://'
            }
            required
          />
        );
        const nameField = (
          <LabeledTextField
            title="Tool Name"
            subtitle="(required)"
            value={newName}
            onChange={setNewName}
            enabled={!isSaving}
            required
          />
        );
        return (
          <>
            <FormSection>
              {nameFirst ? (
                <>
                  {nameField}
                  {urlField}
                </>
              ) : (
                <>
                  {urlField}
                  {nameField}
                </>
              )}
              <LabeledTextField
                title="Description"
                subtitle="(optional)"
                description={descriptionDescription}
                value={newDescription}
                onChange={setNewDescription}
                enabled={!isSaving}
              />
            </FormSection>
            {showBottomButtons && (
              <div css={buttonContainerStyles}>
                <div css={cancelButtonStyles}>
                  <Link buttonStyle enabled={!isSaving} href={backHref}>
                    Cancel
                  </Link>
                </div>
                <div css={saveButtonStyles}>
                  <Button
                    primary
                    enabled={!isSaving}
                    loading={isSaving}
                    onClick={() =>
                      asyncFunctionWrapper(() =>
                        onSave({
                          id,
                          name: newName,
                          url: newUrl,
                          description: newDescription,
                        }),
                      )
                    }
                  >
                    {saveButtonText}
                  </Button>
                </div>
              </div>
            )}
          </>
        );
      }}
    </EditModal>
  );
};

export default ToolModal;
