import { gp2 } from '@asap-hub/model';
import {
  Button,
  LabeledDropdown,
  pixels,
  FormSection,
  colour,
} from '@asap-hub/react-components';
import { css } from '@emotion/react';
import { ComponentProps, useState, Fragment } from 'react';
import { useNavigate } from 'react-router';
import { addIcon, binIcon } from '../icons';
import { mobileQuery } from '../layout';
import EditUserModal from './EditUserModal';

const { rem } = pixels;

const addButtonStyles = css({
  marginTop: rem(32),
  width: 'fit-content',
  [mobileQuery]: {
    width: '100%',
  },
});

const thinLineStyles = css({
  width: '100%',
  height: '1px',
  marginTop: rem(48),
  marginBottom: rem(48),
  borderTop: `1px solid ${colour.border.tertiary}`,
});

const required = '(required)';
const getValues = <T extends string>(selected: T[]) =>
  selected.map((item) => ({ label: item, value: item }));

type ContributingCohortsModalProps = Pick<
  gp2.UserResponse,
  'contributingCohorts'
> &
  Pick<ComponentProps<typeof EditUserModal>, 'backHref'> & {
    onSave: (userData: gp2.UserPatchRequest) => Promise<void>;
  } & {
    cohortOptions: gp2.ContributingCohortResponse[];
  };

const ContributingCohortsModal: React.FC<ContributingCohortsModalProps> = ({
  onSave,
  backHref,
  contributingCohorts,
  cohortOptions,
}) => {
  const emptyCohort = {
    role: undefined,
    contributingCohortId: undefined,
  };
  const navigate = useNavigate();
  const [newCohorts, setCohorts] = useState<
    Partial<gp2.UserContributingCohort>[]
  >(contributingCohorts.length ? contributingCohorts : [emptyCohort]);

  const checkDirty = () =>
    newCohorts.some(
      (newChort, index) =>
        newChort.contributingCohortId !==
          contributingCohorts[index]?.contributingCohortId ||
        newChort.role !== contributingCohorts[index]?.role,
    );
  const onChangeValue =
    (index: number, property: keyof gp2.UserContributingCohort) =>
    (value: string) =>
      setCohorts(
        Object.assign([], newCohorts, {
          [index]: {
            ...newCohorts[index],
            [property]: value,
          },
        }),
      );
  const onRemove = (index: number) => () =>
    setCohorts(newCohorts.filter((_, idx) => idx !== index));
  const onAdd = () => setCohorts([...newCohorts, emptyCohort]);
  return (
    <EditUserModal
      title="Contributing Cohort Studies"
      description="List out the cohort studies that you have been involved in (up to ten)."
      onSave={async () => {
        const isCohort = (
          cohort: Partial<gp2.UserContributingCohort>,
        ): cohort is gp2.UserContributingCohort =>
          !!cohort.contributingCohortId && !!cohort.role;

        const cleanCohorts = newCohorts.reduce<
          NonNullable<gp2.UserPatchRequest['contributingCohorts']>
        >(
          (acc, { name: _name, ...cohort }) =>
            isCohort(cohort) ? [...acc, cohort] : acc,
          [],
        );
        await onSave({
          contributingCohorts: cleanCohorts,
        });
        void navigate(backHref);
      }}
      backHref={backHref}
      dirty={checkDirty()}
    >
      {({ isSaving }) => (
        <>
          {newCohorts.map(({ contributingCohortId, role }, index, arr) => (
            <Fragment key={`cohort-${index}`}>
              <FormSection
                secondaryTitle={`#${index + 1} Cohort Study`}
                headerDecorator={
                  <Button onClick={onRemove(index)} small noMargin>
                    <span css={css({ display: 'inline-flex' })}>{binIcon}</span>
                  </Button>
                }
              >
                <LabeledDropdown
                  title="Name"
                  subtitle={required}
                  getValidationMessage={() => 'Please add the cohort name'}
                  enabled={!isSaving}
                  value={contributingCohortId || ''}
                  onChange={onChangeValue(index, 'contributingCohortId')}
                  required
                  options={cohortOptions.map(({ id, name }) => ({
                    label: name,
                    value: id,
                  }))}
                  placeholder={'Type a cohort study name...'}
                />
                <LabeledDropdown
                  title="Role"
                  subtitle={required}
                  options={getValues([...gp2.userContributingCohortRole])}
                  enabled={!isSaving}
                  getValidationMessage={() => 'Please add the role'}
                  value={role || ''}
                  onChange={onChangeValue(index, 'role')}
                  required
                  placeholder={'Select a role...'}
                />
              </FormSection>
              {index !== arr.length - 1 && <div css={thinLineStyles} />}
            </Fragment>
          ))}

          {newCohorts.length < 10 ? (
            <div css={addButtonStyles}>
              <Button noMargin onClick={onAdd} enabled={!isSaving} small>
                <span
                  css={{
                    display: 'inline-flex',
                    gap: rem(8),
                    margin: `0 ${rem(3)}`,
                  }}
                >
                  Add {newCohorts.length > 0 ? 'Another' : 'Cohort'} Study{' '}
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

export default ContributingCohortsModal;
