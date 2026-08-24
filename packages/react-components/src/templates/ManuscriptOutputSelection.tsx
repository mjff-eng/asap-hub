import { ManuscriptVersionResponse } from '@asap-hub/model';
import { css } from '@emotion/react';
import { ComponentProps, ReactElement, ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { components } from 'react-select';
import {
  Button,
  contentSidePaddingWithNavigation,
  FormCard,
  LabeledMultiSelect,
  LabeledRadioButtonGroup,
  MultiSelectOptionsType,
  Pill,
  colour,
} from '..';
import { mobileScreen, rem } from '../pixels';
import { info900, lead, steel } from '../colors';

const mainStyles = css({
  display: 'flex',
  justifyContent: 'center',
  padding: `${rem(36)} ${contentSidePaddingWithNavigation(8)} ${rem(60)}`,
});

const contentStyles = css({
  display: 'grid',
  gridTemplateColumns: '1fr',
  maxWidth: rem(800),
  width: '100%',
  justifyContent: 'center',
  gridAutoFlow: 'row',
  rowGap: rem(32),
});

const optionListStyles = css({
  marginTop: rem(16),
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    gridTemplateColumns: '1fr',
  },
});

const manuscriptImportStyles = css({
  marginTop: rem(32),
});

const emptySpaceStyles = css({
  height: rem(12),
});

const buttonContainerStyles = css({
  display: 'grid',
  columnGap: rem(24),
  gridTemplateRows: 'max-content 12px max-content',
  [`@media (min-width: ${mobileScreen.max - 100}px)`]: {
    gridTemplateColumns: 'max-content max-content',
    gridTemplateRows: 'auto',
    justifyContent: 'flex-end',
  },
});

const confirmButtonStyles = css({
  display: 'flex',
  justifyContent: 'center',
  gridRow: '1 / span 2',
  gridColumn: '1',
  [`@media (min-width: ${mobileScreen.max - 100}px)`]: {
    gridRow: '1',
    gridColumn: '2',
  },
});

const dismissButtonStyles = css({
  display: 'flex',
  justifyContent: 'center',
  gridRow: '2 / span 2',
  gridColumn: '1',
  [`@media (min-width: ${mobileScreen.max - 100}px)`]: {
    gridRow: '1',
  },
});

const singleValueStyles = css({
  padding: `${rem(5)} ${rem(15)} ${rem(5)} ${rem(5)}`,
  display: 'flex',
  flexFlow: 'column',
  justifyContent: 'center',
  alignItems: 'flex-start',
  backgroundColor: colour.neutral[0].rgb,
});

const pillContainerStyles = (isFocused?: boolean) =>
  css({
    display: 'flex',
    gap: rem(8),
    marginTop: rem(8),
    [`@media (max-width: ${mobileScreen.max}px)`]: {
      flexDirection: 'column',
    },
    '& > *:nth-of-type(1), & > *:nth-of-type(2)': {
      backgroundColor: isFocused ? steel.hex : undefined,
      color: isFocused ? lead.hex : undefined,
    },
    '& > *:nth-of-type(3)': {
      backgroundColor: isFocused ? '#CFEDFB' : undefined,
      color: isFocused ? info900.hex : undefined,
    },
  });

export type ManuscriptVersionOption = {
  version?: ManuscriptVersionResponse;
} & MultiSelectOptionsType;

type ManuscriptOutputSelectionProps = {
  isImportingManuscript: boolean;
  manuscriptOutputSelection: 'manually' | 'import' | '';
  onChangeManuscriptOutputSelection: (
    manuscriptOutputSelection: 'manually' | 'import' | '',
  ) => void;
  onSelectCreateManually: () => void;
  onImportManuscript: () => void;
  selectedVersion?: ManuscriptVersionOption;
  setSelectedVersion: (versionOption: ManuscriptVersionOption) => void;
  getManuscriptVersionOptions: NonNullable<
    ComponentProps<typeof LabeledMultiSelect>['loadOptions']
  >;
};

const ManuscriptVersionLabel = ({
  version,
  isFocused = false,
  children,
}: {
  version?: ManuscriptVersionResponse;
  isFocused?: boolean;
  children: ReactElement | ReactNode;
}) => (
  <div css={{ display: 'flex', flexDirection: 'column', rowGap: rem(9) }}>
    {version && (
      <div css={pillContainerStyles(isFocused)}>
        <Pill accent="gray">{version.type}</Pill>
        <Pill accent="gray">{version.lifecycle}</Pill>
        <Pill accent="blue">{version.manuscriptId}</Pill>
      </div>
    )}
    <span>{children}</span>
  </div>
);
const ManuscriptOutputSelection: React.FC<ManuscriptOutputSelectionProps> = ({
  isImportingManuscript,
  onChangeManuscriptOutputSelection,
  manuscriptOutputSelection,
  onSelectCreateManually,
  onImportManuscript,
  getManuscriptVersionOptions,
  selectedVersion,
  setSelectedVersion,
}) => {
  const navigate = useNavigate();

  const handleCancel = () => {
    void navigate(-1);
  };

  const renderManuscriptImport = () => {
    if (manuscriptOutputSelection !== 'import') {
      return <div css={emptySpaceStyles} />;
    }

    return (
      <div css={manuscriptImportStyles}>
        <LabeledMultiSelect<ManuscriptVersionOption, false>
          isMulti={false}
          title="Manuscript"
          description="Only the latest version of the manuscript is available for import. If the first preprint version hasn't been imported yet, it will be added automatically."
          subtitle="(required)"
          required
          placeholder="Start typing..."
          noOptionsMessage={({ inputValue }: { inputValue: string }) =>
            `Sorry, no manuscripts match ${inputValue}`
          }
          loadOptions={getManuscriptVersionOptions}
          components={{
            SingleValue: (singleValueLabelProps) => (
              <components.SingleValue
                {...singleValueLabelProps}
                innerProps={{
                  ...singleValueLabelProps.innerProps,
                  style: {
                    position: 'static',
                    transform: 'none',
                    whiteSpace: 'normal',
                    lineHeight: '1.4',
                  },
                }}
              >
                <div
                  css={
                    singleValueLabelProps.data.version && [singleValueStyles]
                  }
                >
                  <ManuscriptVersionLabel
                    version={singleValueLabelProps.data.version}
                  >
                    {singleValueLabelProps.children}
                  </ManuscriptVersionLabel>
                </div>
              </components.SingleValue>
            ),
            Option: (optionProps) => (
              <components.Option {...optionProps}>
                <div>
                  {optionProps.data.version && (
                    <ManuscriptVersionLabel
                      version={optionProps.data.version}
                      isFocused={optionProps.isFocused}
                    >
                      {optionProps.children}
                    </ManuscriptVersionLabel>
                  )}
                </div>
              </components.Option>
            ),
          }}
          onChange={(version: ManuscriptVersionOption) => {
            setSelectedVersion(version ?? undefined);
          }}
          values={selectedVersion}
          maxMenuHeight={170}
        />
      </div>
    );
  };

  const renderActionButtons = () => {
    if (manuscriptOutputSelection === '') {
      return null;
    }

    return (
      <div css={buttonContainerStyles}>
        <div css={dismissButtonStyles}>
          <Button noMargin onClick={handleCancel}>
            Cancel
          </Button>
        </div>
        <div css={confirmButtonStyles}>
          <Button
            noMargin
            enabled={
              manuscriptOutputSelection !== 'import' ||
              (manuscriptOutputSelection === 'import' &&
                !!selectedVersion &&
                !isImportingManuscript)
            }
            onClick={
              manuscriptOutputSelection === 'manually'
                ? onSelectCreateManually
                : onImportManuscript
            }
            primary
            loading={isImportingManuscript}
          >
            {manuscriptOutputSelection === 'manually' ? 'Create' : 'Import'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <main css={mainStyles}>
      <div css={contentStyles}>
        <FormCard title="How would you like to create your output?">
          <LabeledRadioButtonGroup<'manually' | 'import' | ''>
            title="Select the type of output you want to create:"
            subtitle="(required)"
            options={[
              { value: 'manually', label: 'Create manually' },
              { value: 'import', label: 'Import from compliance' },
            ]}
            value={manuscriptOutputSelection ?? ''}
            onChange={onChangeManuscriptOutputSelection}
            overrideOptionListStyles={optionListStyles}
          />
          {renderManuscriptImport()}
        </FormCard>
        {renderActionButtons()}
      </div>
    </main>
  );
};

export default ManuscriptOutputSelection;
