import { useState, Fragment } from 'react';
import { css } from '@emotion/react';
import { UserPatchRequest, UserResponse } from '@asap-hub/model';
import { useNavigate } from 'react-router';
import { noop } from '../utils';
import {
  LabeledTextField,
  LabeledTextArea,
  LabeledDropdown,
} from '../molecules';
import { EditUserModal } from '../organisms';
import { rem } from '../pixels';
import { colors } from '..';

type RoleModalProps = Pick<
  UserResponse,
  | 'teams'
  | 'labs'
  | 'researchInterests'
  | 'responsibilities'
  | 'role'
  | 'reachOut'
  | 'firstName'
> & {
  onSave?: (data: UserPatchRequest) => Promise<void>;
  backHref: string;
};

const thinLineStyles = css({
  width: '100%',
  height: '1px',
  borderTop: `1px solid ${colors.neutral500.rgb}`,
});

const RoleModal: React.FC<RoleModalProps> = ({
  teams,
  labs,
  researchInterests = '',
  responsibilities = '',
  reachOut = '',
  firstName,
  role,
  onSave = noop,
  backHref,
}) => {
  const navigate = useNavigate();
  const [newResearchInterests, setNewResearchInterests] =
    useState(researchInterests);
  const [newResponsibilities, setNewResponsibilities] =
    useState(responsibilities);
  const [newReachOut, setNewReachOut] = useState(reachOut);
  return (
    <EditUserModal
      title="Roles"
      dirty={
        newResearchInterests !== researchInterests ||
        newResponsibilities !== responsibilities
      }
      backHref={backHref}
      onSave={async () => {
        await onSave({
          researchInterests: newResearchInterests.trim(),
          responsibilities: newResponsibilities.trim(),
          reachOut: newReachOut.trim(),
        });
        void navigate(backHref);
      }}
      description={`Tell the network what role you play in your team and your main research goals by completing this part of your profile. (Note: if you need to change any locked fields, please contact ASAP)`}
    >
      {({ isSaving }) => (
        <>
          {teams.map(({ displayName, role: teamRole, id }, index) => (
            <Fragment key={id}>
              <div
                style={{ display: 'flex', flexFlow: 'column', gap: rem(24) }}
              >
                <LabeledTextField
                  key={`team-${id}`}
                  title="Team"
                  value={displayName ?? ''}
                  enabled={false}
                />
                <LabeledDropdown
                  key={`team${id}-role`}
                  title="Role"
                  enabled={false}
                  value={teamRole}
                  options={[{ label: teamRole, value: teamRole }]}
                />
              </div>
              {teams.length > 1 && <div css={thinLineStyles} />}
            </Fragment>
          ))}
          {labs.map(({ name, id }) => (
            <LabeledTextField
              key={`lab-${id}`}
              title="Lab"
              value={name}
              enabled={false}
            />
          ))}
          {role !== 'Staff' && (
            <LabeledTextArea
              required
              title="Main Research Interests"
              subtitle="(required)"
              placeholder="Example: Randy is interested in membrane assembly, vesicular transport, and membrane fusion among organelles of the secretary pathway."
              getValidationMessage={() => 'Please add your research interests.'}
              maxLength={200}
              enabled={!isSaving}
              value={newResearchInterests}
              onChange={setNewResearchInterests}
            />
          )}
          <LabeledTextArea
            required
            title="Responsibilities"
            subtitle="(required)"
            placeholder="Example: Randy will be responsible for applying basic principles he developed from studies of a simple eukaryote, yeast, to investigate the mechanisms of intracellular vesicular transport and biogenesis of extracellular vesicles (exosomes) in cultured human cells. His team's current work is devoted to understanding how proteins and RNA are sorted into extracellular vesicles and how these molecules may be delivered to target cells in relation to normal and pathological functions."
            getValidationMessage={() => 'Please add your responsibilities.'}
            maxLength={500}
            enabled={!isSaving}
            value={newResponsibilities}
            onChange={setNewResponsibilities}
            tip="Tip: Refer to yourself in the third person."
          />
          {role === 'Staff' && (
            <LabeledTextArea
              title={`Reach out to ${firstName} if…`}
              subtitle="(optional)"
              placeholder="E.g: You have questions about preclinical tools/data sharing, subgroup meetings or collaboration opportunities."
              tip="Tip: Refer to yourself in the third person."
              maxLength={250}
              enabled={!isSaving}
              value={newReachOut}
              onChange={setNewReachOut}
            />
          )}
        </>
      )}
    </EditUserModal>
  );
};

export default RoleModal;
