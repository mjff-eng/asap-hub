import {
  AuthorEmailField,
  AuthorSelectOption,
  ManuscriptError,
  ManuscriptFileResponse,
  ManuscriptFileType,
  ManuscriptFormData,
  manuscriptFormFieldsMapping,
  ManuscriptLifecycle,
  manuscriptLifecycleRequiredURL,
  ManuscriptPostAuthor,
  ManuscriptPostRequest,
  ManuscriptPutRequest,
  ManuscriptResponse,
  ManuscriptType,
  manuscriptTypeLifecycles,
  manuscriptTypes,
  ManuscriptVersion,
  QuestionChecksOption,
  QuickCheck,
  QuickCheckDetails,
  quickCheckQuestions,
} from '@asap-hub/model';
import { isInternalUser, urlExpression } from '@asap-hub/validation';
import { css } from '@emotion/react';
import {
  ComponentProps,
  FormEvent,
  useCallback,
  useState,
  lazy,
  useEffect,
  useMemo,
  memo,
  Suspense,
  useRef,
} from 'react';
import { Controller, useForm } from 'react-hook-form';
import { colors, LabeledDateInput } from '..';
import { Button, Link, MultiSelectOptionsType, Paragraph } from '../atoms';
import { defaultPageLayoutPaddingStyle } from '../layout';
import { mobileScreen, rem } from '../pixels';
import { ExternalLinkIcon, GlobeIcon } from '../icons';
import { LabeledDropdownType } from '../molecules/LabeledDropdown';
import { LabeledRadioButtonGroupType } from '../molecules/LabeledRadioButtonGroup';
import { AuthorSelectType } from '../organisms/AuthorSelect';
import { MultiSelectOnChange } from '../atoms/MultiSelect';
import {
  getAuthorsMissingTeam,
  getLabsMissingPITeam,
  missingPITeamLabsMessage,
  missingTeamAuthorsMessage,
  nonProjectMemberAuthorsMessage,
} from '../utils';
import ManuscriptFormModals from '../organisms/ManuscriptFormModals';
import LabeledFileField from '../molecules/LabeledFileField';
import { mailToSupport, TECH_SUPPORT_EMAIL } from '../mail';

const loadManuscriptAuthors = () =>
  import(
    /* webpackChunkName: "manuscript-authors" */ '../organisms/ManuscriptAuthors'
  );
const loadShortDescriptionCard = () =>
  import(
    /* webpackChunkName: "short-description-card" */ '../organisms/ShortDescriptionCard'
  );
const loadLabeledMultiSelect = () =>
  import(
    /* webpackChunkName: "labeled-multi-select" */ '../molecules/LabeledMultiSelect'
  );
const loadLabeledTextField = () =>
  import(
    /* webpackChunkName: "labeled-text-field" */ '../molecules/LabeledTextField'
  );
const loadFormCard = () =>
  import(/* webpackChunkName: "form-card" */ '../molecules/FormCard');
const loadLabeledDropdown = () =>
  import(
    /* webpackChunkName: "labeled-dropdown" */ '../molecules/LabeledDropdown'
  );
const loadLabeledRadioButtonGroup = () =>
  import(
    /* webpackChunkName: "labeled-radio-button-group" */ '../molecules/LabeledRadioButtonGroup'
  );

const ManuscriptAuthors = lazy(loadManuscriptAuthors);
const ShortDescriptionCard = lazy(loadShortDescriptionCard);
const LabeledMultiSelect = lazy(loadLabeledMultiSelect);
const LabeledTextField = lazy(loadLabeledTextField);
const FormCard = lazy(loadFormCard);
const LabeledDropdown = lazy(loadLabeledDropdown) as LabeledDropdownType;
const LabeledRadioButtonGroup = lazy(
  loadLabeledRadioButtonGroup,
) as LabeledRadioButtonGroupType;

const LabeledTextArea = lazy(() => import('../molecules/LabeledTextArea'));

const MAX_FILE_SIZE = 100_000_000;
const KRT_GUIDANCE_FILE =
  'https://docs.google.com/document/d/1FCnqC3VpvLFPLcshLSkmGPtRIFfh70MR7KkrXi7IMX4/edit?usp=sharing';
const mainStyles = css({
  display: 'flex',
  justifyContent: 'center',
  padding: defaultPageLayoutPaddingStyle,
});

const contentStyles = css({
  display: 'grid',
  gridTemplateColumns: '1fr',
  maxWidth: rem(800),
  justifyContent: 'center',
  rowGap: rem(32),
});

const buttonsOuterContainerStyles = css({
  display: 'flex',
  justifyContent: 'end',
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    width: '100%',
  },
});

const buttonsInnerContainerStyles = css({
  display: 'flex',
  flexDirection: 'row',
  gap: rem(24),
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    flexDirection: 'column-reverse',
    width: '100%',
  },
});

type LabOption = MultiSelectOptionsType & {
  labPITeamIds: string[];
  labPrincipalInvestigatorId?: string;
};

type OptionalVersionFields = Array<
  keyof Omit<
    ManuscriptVersion,
    | 'id'
    | 'type'
    | 'lifecycle'
    | 'complianceReport'
    | 'complianceReportResponse'
    | 'count'
    | 'createdBy'
    | 'updatedBy'
    | 'createdDate'
    | 'publishedAt'
    | 'firstAuthors'
    | 'correspondingAuthor'
    | 'additionalAuthors'
    | 'versionUID'
  >
>;

type DefaultFieldValueMapping = Record<
  OptionalVersionFields[number],
  '' | 'Already submitted'
>;

const optionalVersionFields: OptionalVersionFields = [
  'preprintDoi',
  'publicationDoi',
  'otherDetails',

  'acknowledgedGrantNumber',
  'asapAffiliationIncluded',
  'availabilityStatement',
  'manuscriptLicense',
  'datasetsDeposited',
  'codeDeposited',
  'protocolsDeposited',
  'labMaterialsRegistered',
];

export const getPostAuthors = (
  authorSelectOptions: AuthorSelectOption[] | AuthorSelectOption,
  authorEmailFields: AuthorEmailField[],
): ManuscriptPostAuthor[] => {
  if (
    Array.isArray(authorSelectOptions) &&
    authorSelectOptions.length &&
    Array.isArray(authorEmailFields)
  ) {
    const users = authorSelectOptions.reduce(
      (internalAuthors: { userId: string }[], { value, author }) => {
        if (author && isInternalUser(author)) {
          internalAuthors.push({ userId: value });
        }
        return internalAuthors;
      },
      [],
    );

    const externalUsers = (authorEmailFields || []).map(
      ({ id, name, email }) => ({
        externalAuthorId: id,
        externalAuthorName: name,
        externalAuthorEmail: email,
      }),
    );

    return [...users, ...externalUsers];
  }

  return [];
};

const getQuickCheckDescription = (quickCheck: QuickCheck) => {
  if (quickCheck === 'availabilityStatement') {
    return (
      <>
        Review the{' '}
        <Link href="https://docs.google.com/document/d/1rkAsm9UrElP8OhXCdxQXKxNGWz4HsOAIXrYtfxAn7kI/edit">
          compliance checklist
        </Link>{' '}
        for more information.
      </>
    );
  }

  return null;
};

const getFieldsToReset = (
  fieldsList: OptionalVersionFields,
  manuscriptType: ManuscriptType,
  manuscriptLifecycle: ManuscriptLifecycle,
) =>
  fieldsList.filter(
    (field) =>
      !manuscriptFormFieldsMapping[manuscriptType][
        manuscriptLifecycle
      ].includes(field),
  );

const setDefaultFieldValues = (fieldsList: OptionalVersionFields) => {
  const fieldDefaultValueMap = fieldsList.reduce(
    (map, field) => ({ ...map, [field]: '' }),
    {} as DefaultFieldValueMapping,
  );

  return fieldDefaultValueMap;
};

type ManuscriptFormProps = Omit<
  ManuscriptVersion,
  | 'id'
  | 'type'
  | 'lifecycle'
  | 'manuscriptFile'
  | 'keyResourceTable'
  | 'additionalFiles'
  | 'description'
  | 'shortDescription'
  | 'count'
  | 'createdBy'
  | 'updatedBy'
  | 'createdDate'
  | 'publishedAt'
  | 'teams'
  | 'labs'
  | 'versionUID'
> &
  Partial<
    Pick<
      ManuscriptPostRequest,
      | 'title'
      | 'url'
      | 'preprintDate'
      | 'publicationDate'
      | 'layImpactStatement'
    >
  > & {
    isOpenScienceTeamMember?: boolean;
    type?: ManuscriptVersion['type'] | '';
    lifecycle?: ManuscriptVersion['lifecycle'] | '';
    manuscriptFile?: ManuscriptFileResponse;
    complianceReportResponse?: ManuscriptFileResponse;
    keyResourceTable?: ManuscriptFileResponse;
    additionalFiles?: ManuscriptFileResponse[];
    description?: string | '';
    shortDescription?: string | '';
    eligibilityReasons: Set<string>;
    resubmitManuscript?: boolean;
    getShortDescriptionFromDescription: (
      descriptionMD: string,
    ) => Promise<string>;
    onCreate: (
      output: ManuscriptPostRequest,
    ) => Promise<ManuscriptResponse | void>;
    onUpdate: (
      id: string,
      output: ManuscriptPutRequest,
    ) => Promise<ManuscriptResponse | void>;
    onResubmit: (
      id: string,
      output: ManuscriptPostRequest,
    ) => Promise<ManuscriptResponse | void>;
    manuscriptId?: string;
    onSuccess: () => void;
    handleFileUpload: (
      file: File,
      fileType: ManuscriptFileType,
      handleError: (errorMessage: string) => void,
    ) => Promise<ManuscriptFileResponse | undefined>;
    teamId?: string;
    projectId?: string;
    getTeamSuggestions?: ComponentProps<
      typeof LabeledMultiSelect
    >['loadOptions'];
    selectedTeams: MultiSelectOptionsType[];
    selectedLabs: MultiSelectOptionsType[];
    getLabSuggestions?: ComponentProps<
      typeof LabeledMultiSelect
    >['loadOptions'];
    getAuthorSuggestions: NonNullable<
      ComponentProps<AuthorSelectType>['loadOptions']
    >;
    firstAuthors?: AuthorSelectOption[];
    correspondingAuthor?: AuthorSelectOption[];
    additionalAuthors?: AuthorSelectOption[];
    onError: (error: ManuscriptError | Error) => void;
    clearFormToast: () => void;
    getImpactSuggestions: (
      searchQuery: string,
    ) => Promise<{ label: string; value: string }[]>;
    getCategorySuggestions: NonNullable<
      ComponentProps<typeof LabeledMultiSelect>['loadOptions']
    >;
    impact?: MultiSelectOptionsType;
    categories: MultiSelectOptionsType[];
    onInvalid?: () => void;
    versionsCount?: number;
    projectMemberIds?: string[];
  };

const ManuscriptForm: React.FC<ManuscriptFormProps> = ({
  manuscriptId,
  onCreate,
  onUpdate,
  onResubmit,
  onSuccess,
  onError,
  handleFileUpload,
  teamId,
  projectId,
  isOpenScienceTeamMember,
  title,
  preprintDate,
  publicationDate,
  url,
  impact,
  layImpactStatement,
  categories,
  type,
  lifecycle,
  manuscriptFile,
  keyResourceTable,
  complianceReportResponse,
  additionalFiles,
  eligibilityReasons,
  preprintDoi,
  publicationDoi,
  otherDetails,
  acknowledgedGrantNumber,
  asapAffiliationIncluded,
  manuscriptLicense,
  datasetsDeposited,
  codeDeposited,
  protocolsDeposited,
  labMaterialsRegistered,
  availabilityStatement,
  acknowledgedGrantNumberDetails,
  asapAffiliationIncludedDetails,
  manuscriptLicenseDetails,
  datasetsDepositedDetails,
  codeDepositedDetails,
  protocolsDepositedDetails,
  labMaterialsRegisteredDetails,
  availabilityStatementDetails,
  getTeamSuggestions,
  selectedTeams,
  getLabSuggestions,
  selectedLabs,
  getAuthorSuggestions,
  description,
  shortDescription,
  firstAuthors,
  correspondingAuthor,
  additionalAuthors,
  resubmitManuscript = false,
  clearFormToast,
  getShortDescriptionFromDescription,
  getImpactSuggestions,
  getCategorySuggestions,
  onInvalid,
  versionsCount = 0,
  projectMemberIds,
}: ManuscriptFormProps) => {
  const formRef = useRef<HTMLFormElement>(null);
  // Read by validators at call time. formState.isSubmitting cannot be used for
  // this: validators run inside handleSubmit before the re-render that would
  // update its value in their closures, so untouched required fields (e.g. Labs
  // on the submit journey) would pass validation on the first submit attempt.
  const hasAttemptedSubmitRef = useRef(false);
  const firstAuthorsWithoutTeamAdded = new Set<string>();
  const correspondingAuthorWithoutTeamAdded = new Set<string>();
  const additionalAuthorsWithoutTeamAdded = new Set<string>();
  const labsWithValidationIssues = new Set<string>();
  const isProjectManuscript = Boolean(projectId);

  const [impactOptions, setImpactOptions] = useState<
    {
      label: string;
      value: string;
    }[]
  >([]);

  const getImpactOptions = useCallback(async () => {
    const impactSuggestions = await getImpactSuggestions('');
    setImpactOptions(impactSuggestions);
  }, [getImpactSuggestions]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    getImpactOptions();
  }, [getImpactOptions]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const getDefaultQuickCheckValue = (
    quickCheck: string | undefined,
    quickCheckDetails: string | undefined,
  ) => {
    const isEditing = !!title;

    if (isEditing && !resubmitManuscript) {
      return quickCheckDetails ? quickCheck : 'Yes';
    }

    return undefined;
  };

  const isEditMode = !!manuscriptId && !resubmitManuscript;
  const canSubmitComplianceReportResponse =
    resubmitManuscript || (isEditMode && versionsCount > 1);
  const shouldEnablePreprintDateField = !preprintDate;
  const preprintDateFieldDescription = shouldEnablePreprintDateField
    ? 'Enter the date that version 1 of this manuscript was originally uploaded as a preprint to a repository. This date cannot be changed later.'
    : 'The date that version 1 of this manuscript was originally uploaded as a preprint to a repository. This date cannot be edited.';
  const shouldEnablePublicationDateField = !publicationDate;
  const publicationDateFieldDescription = shouldEnablePublicationDateField
    ? 'Enter the date that this manuscript was originally published (i.e., not the preprint date). This date cannot be changed later.'
    : 'The date that this manuscript was originally published (i.e., not the preprint date). This date cannot be edited.';
  const shouldEnableUrlField = !url || isOpenScienceTeamMember;

  const methods = useForm<ManuscriptFormData>({
    mode: 'all',
    defaultValues: {
      title: title || '',
      url: url || undefined,
      preprintDate: preprintDate ? preprintDate.slice(0, 10) : '',
      publicationDate: publicationDate ? publicationDate.slice(0, 10) : '',
      layImpactStatement: layImpactStatement || '',
      impact,
      categories: categories || [],
      versions: [
        {
          type: type || '',
          lifecycle: resubmitManuscript ? undefined : lifecycle || '',
          preprintDoi: preprintDoi || '',
          publicationDoi: publicationDoi || '',
          otherDetails: otherDetails || '',
          manuscriptFile: resubmitManuscript ? undefined : manuscriptFile,
          keyResourceTable: resubmitManuscript ? undefined : keyResourceTable,
          complianceReportResponse: resubmitManuscript
            ? undefined
            : complianceReportResponse,
          additionalFiles: resubmitManuscript ? undefined : additionalFiles,

          acknowledgedGrantNumber: getDefaultQuickCheckValue(
            acknowledgedGrantNumber,
            acknowledgedGrantNumberDetails,
          ),
          asapAffiliationIncluded: getDefaultQuickCheckValue(
            asapAffiliationIncluded,
            asapAffiliationIncludedDetails,
          ),
          manuscriptLicense: getDefaultQuickCheckValue(
            manuscriptLicense,
            manuscriptLicenseDetails,
          ),
          datasetsDeposited: getDefaultQuickCheckValue(
            datasetsDeposited,
            datasetsDepositedDetails,
          ),
          codeDeposited: getDefaultQuickCheckValue(
            codeDeposited,
            codeDepositedDetails,
          ),
          protocolsDeposited: getDefaultQuickCheckValue(
            protocolsDeposited,
            protocolsDepositedDetails,
          ),
          labMaterialsRegistered: getDefaultQuickCheckValue(
            labMaterialsRegistered,
            labMaterialsRegisteredDetails,
          ),
          availabilityStatement: getDefaultQuickCheckValue(
            availabilityStatement,
            availabilityStatementDetails,
          ),
          acknowledgedGrantNumberDetails: resubmitManuscript
            ? undefined
            : acknowledgedGrantNumberDetails ?? undefined,
          asapAffiliationIncludedDetails: resubmitManuscript
            ? undefined
            : asapAffiliationIncludedDetails ?? undefined,
          manuscriptLicenseDetails: resubmitManuscript
            ? undefined
            : manuscriptLicenseDetails ?? undefined,
          datasetsDepositedDetails: resubmitManuscript
            ? undefined
            : datasetsDepositedDetails ?? undefined,
          codeDepositedDetails: resubmitManuscript
            ? undefined
            : codeDepositedDetails ?? undefined,
          protocolsDepositedDetails: resubmitManuscript
            ? undefined
            : protocolsDepositedDetails ?? undefined,
          labMaterialsRegisteredDetails: resubmitManuscript
            ? undefined
            : labMaterialsRegisteredDetails ?? undefined,
          availabilityStatementDetails: resubmitManuscript
            ? undefined
            : availabilityStatementDetails ?? undefined,
          teams: selectedTeams || [],
          labs: selectedLabs || [],
          description: description || '',
          shortDescription: shortDescription || '',
          firstAuthors: firstAuthors || [],
          firstAuthorsEmails: [],
          correspondingAuthor: correspondingAuthor || [],
          correspondingAuthorEmails: [],
          additionalAuthors: additionalAuthors || [],
          additionalAuthorsEmails: [],
        },
      ],
    },
  });

  const [isUploadingManuscriptFile, setIsUploadingManuscriptFile] =
    useState(false);
  const [isUploadingKeyResourceTable, setIsUploadingKeyResourceTable] =
    useState(false);
  const [isUploadingAdditionalFiles, setIsUploadingAdditionalFiles] =
    useState(false);
  const [
    isUploadingComplianceReportResponse,
    setIsUploadingComplianceReportResponse,
  ] = useState(false);

  const {
    handleSubmit,
    control,
    getValues,
    getFieldState,
    watch,
    setValue,
    setError,
    clearErrors,
    resetField,
    trigger,
  } = methods;

  const watchType = watch('versions.0.type');
  const watchLifecycle = watch('versions.0.lifecycle');

  const isPreprintDateRequired = Boolean(
    watchType &&
      watchLifecycle &&
      manuscriptFormFieldsMapping[watchType][watchLifecycle].includes(
        'preprintDate',
      ),
  );
  const isPublicationDateRequired = Boolean(
    watchType &&
      watchLifecycle &&
      manuscriptFormFieldsMapping[watchType][watchLifecycle].includes(
        'publicationDate',
      ),
  );
  const showPreprintDateField = isPreprintDateRequired || !!preprintDate;
  const showPublicationDateField =
    isPublicationDateRequired || !!publicationDate;

  type AllowedVersionFields = `versions.0.${OptionalVersionFields[number]}`;

  const updateOptionalFields = useCallback(
    (manuscriptType: string, lifecycleField: string) => {
      if (!manuscriptType || !lifecycleField) return;

      const fieldsToReset = getFieldsToReset(
        optionalVersionFields,
        manuscriptType as ManuscriptType,
        lifecycleField as ManuscriptLifecycle,
      );
      const fieldDefaultValueMap = setDefaultFieldValues(fieldsToReset);

      // Instead of full form reset, selectively update fields so values the
      // user already entered (teams, labs, authors...) are preserved
      Object.entries(fieldDefaultValueMap).forEach(([field, value]) => {
        setValue(`versions.0.${field}` as AllowedVersionFields, value, {
          shouldValidate: false,
        });
      });
    },
    [setValue],
  );

  const validateLabPiTeams = async (labs: MultiSelectOptionsType[]) => {
    const teams = getValues('versions.0.teams') || [];

    const teamFormIds = teams.map((team) => team.value);

    labsWithValidationIssues.clear();
    const hasTouchedLabs = getFieldState('versions.0.labs').isTouched;

    // --- Required field check ---
    // If no labs are selected and either the user has touched the field
    // or a submit has been attempted, show a "required" error
    if (
      (!labs || labs.length === 0) &&
      (hasTouchedLabs || hasAttemptedSubmitRef.current)
    ) {
      await trigger('versions.0.teams');
      return 'Please add at least one lab.';
    }

    // If the user hasn't touched the field and no submit has been attempted, skip further validation
    if (!hasTouchedLabs && !hasAttemptedSubmitRef.current) {
      return true;
    }

    getLabsMissingPITeam(labs as LabOption[], teamFormIds).forEach((lab) => {
      labsWithValidationIssues.add(lab.label);
    });

    await trigger('versions.0.teams');

    if (labsWithValidationIssues.size > 0) {
      return missingPITeamLabsMessage(Array.from(labsWithValidationIssues));
    }
    return true;
  };

  const validateTeams = async () => {
    if (
      firstAuthorsWithoutTeamAdded.size === 0 &&
      correspondingAuthorWithoutTeamAdded.size === 0 &&
      additionalAuthorsWithoutTeamAdded.size === 0 &&
      labsWithValidationIssues.size === 0
    ) {
      return true;
    }
    return ' ';
  };

  const buildMissingContributorsError = (
    role: string,
    missingContributors: Set<string>,
  ) => {
    if (missingContributors.size === 0) {
      return true;
    }
    const labels = Array.from(missingContributors);
    return isProjectManuscript
      ? nonProjectMemberAuthorsMessage(role, labels)
      : missingTeamAuthorsMessage(role, labels);
  };

  const validateFirstAuthors = async (
    selectedFirstAuthors: AuthorSelectOption[],
  ) => {
    const teamsValues = getValues('versions.0.teams') || [];
    const teamFormIds = teamsValues.map((team) => team.value);

    firstAuthorsWithoutTeamAdded.clear();

    const hasTouchedFirstAuthors = getFieldState(
      'versions.0.firstAuthors',
    ).isTouched;

    // --- Required field check ---
    // If no first authors are selected and either the user has touched the field
    // or a submit has been attempted, show a "required" error

    if (
      selectedFirstAuthors.length === 0 &&
      (hasTouchedFirstAuthors || hasAttemptedSubmitRef.current)
    ) {
      if (!isProjectManuscript) {
        await trigger('versions.0.teams');
      }
      return 'Please add at least one author.';
    }

    // If the user hasn't touched the field and no submit has been attempted, skip further validation
    if (!hasTouchedFirstAuthors && !hasAttemptedSubmitRef.current) {
      return true;
    }

    const firstAuthorsMissing = isProjectManuscript
      ? selectedFirstAuthors.filter(
          (algoliaAuthor) =>
            'author' in algoliaAuthor &&
            algoliaAuthor.author &&
            isInternalUser(algoliaAuthor.author) &&
            !(projectMemberIds ?? []).includes(algoliaAuthor.value),
        )
      : getAuthorsMissingTeam(selectedFirstAuthors, teamFormIds);

    firstAuthorsMissing.forEach((author) => {
      firstAuthorsWithoutTeamAdded.add(author.label);
    });

    if (!isProjectManuscript) {
      await trigger('versions.0.teams');
    }

    return buildMissingContributorsError(
      'first author(s)',
      firstAuthorsWithoutTeamAdded,
    );
  };

  const validateCorrespondingAuthor = async (
    selectedCorrespondingAuthor: AuthorSelectOption[],
  ) => {
    const correspondingAuthorValue = selectedCorrespondingAuthor[0];

    const teams = getValues('versions.0.teams') || [];
    const teamFormIds = teams.map((team) => team.value);

    correspondingAuthorWithoutTeamAdded.clear();

    const selectedCorrespondingAuthors = correspondingAuthorValue
      ? [correspondingAuthorValue]
      : [];
    const correspondingAuthorMissing = isProjectManuscript
      ? selectedCorrespondingAuthors.filter(
          (algoliaAuthor) =>
            'author' in algoliaAuthor &&
            algoliaAuthor.author &&
            isInternalUser(algoliaAuthor.author) &&
            !(projectMemberIds ?? []).includes(algoliaAuthor.value),
        )
      : getAuthorsMissingTeam(selectedCorrespondingAuthors, teamFormIds);

    correspondingAuthorMissing.forEach((author) => {
      correspondingAuthorWithoutTeamAdded.add(author.label);
    });

    if (!isProjectManuscript) {
      await trigger('versions.0.teams');
    }

    return buildMissingContributorsError(
      'corresponding author(s)',
      correspondingAuthorWithoutTeamAdded,
    );
  };

  const validateAdditionalAuthors = async (
    selectedAdditionalAuthors: AuthorSelectOption[],
  ) => {
    const teams = getValues('versions.0.teams') || [];
    const teamFormIds = teams.map((team) => team.value);

    additionalAuthorsWithoutTeamAdded.clear();

    const additionalAuthorsMissing = isProjectManuscript
      ? selectedAdditionalAuthors.filter(
          (algoliaAuthor) =>
            'author' in algoliaAuthor &&
            algoliaAuthor.author &&
            isInternalUser(algoliaAuthor.author) &&
            !(projectMemberIds ?? []).includes(algoliaAuthor.value),
        )
      : getAuthorsMissingTeam(selectedAdditionalAuthors, teamFormIds);

    additionalAuthorsMissing.forEach((author) => {
      additionalAuthorsWithoutTeamAdded.add(author.label);
    });

    if (!isProjectManuscript) {
      await trigger('versions.0.teams');
    }

    return buildMissingContributorsError(
      'additional author(s)',
      additionalAuthorsWithoutTeamAdded,
    );
  };

  const commonManuscriptAuthorProps = {
    control,
    getAuthorSuggestions,
    getValues,
    isSubmitting,
    trigger,
    setValue,
  };

  const getSubmittingQuickChecks = (
    versionData: ManuscriptFormData['versions'][number],
  ) => {
    const quickChecks = [
      'acknowledgedGrantNumber',
      'asapAffiliationIncluded',
      'availabilityStatement',
      'manuscriptLicense',
      'datasetsDeposited',
      'codeDeposited',
      'protocolsDeposited',
      'labMaterialsRegistered',
    ] as const;

    return quickChecks.reduce(
      (
        result: Record<QuickCheck | QuickCheckDetails, string>,
        quickCheck: QuickCheck,
      ) => {
        const quickCheckValue = versionData?.[quickCheck] || undefined;
        const quickCheckDetails = `${quickCheck}Details` as const;
        const quickCheckDetailsValue = versionData?.[quickCheckDetails];
        return {
          ...result,
          [quickCheck]: quickCheckValue,
          [quickCheckDetails]:
            quickCheckValue &&
            quickCheckDetailsValue &&
            ['No', 'Not applicable'].includes(quickCheckValue)
              ? quickCheckDetailsValue
              : '',
        };
      },
      {} as Record<QuickCheck | QuickCheckDetails, string>,
    );
  };

  const onSubmit = async (data: ManuscriptFormData) => {
    setIsSubmitting(true);

    clearFormToast();
    const versionData = data.versions[0];
    const urlValue = data.url || undefined;
    const preprintDateValue =
      showPreprintDateField && data.preprintDate
        ? new Date(data.preprintDate).toISOString()
        : undefined;
    const publicationDateValue =
      showPublicationDateField && data.publicationDate
        ? new Date(data.publicationDate).toISOString()
        : undefined;

    if (versionData?.type && versionData.lifecycle) {
      const {
        firstAuthorsEmails,
        correspondingAuthorEmails,
        additionalAuthorsEmails,
        ...requestVersionData
      } = versionData;

      const versionDataPayload = {
        publicationDoi: versionData?.publicationDoi || undefined,
        preprintDoi: versionData?.preprintDoi || undefined,
        otherDetails: versionData?.otherDetails || undefined,
        description: versionData.description || '',

        ...getSubmittingQuickChecks(versionData),
        teams: (versionData.teams ?? []).map((team) => team.value),
        labs: versionData.labs.map((lab) => lab.value),
        firstAuthors: getPostAuthors(
          versionData.firstAuthors,
          firstAuthorsEmails,
        ),
        correspondingAuthor: getPostAuthors(
          versionData.correspondingAuthor,
          correspondingAuthorEmails,
        )?.[0],
        additionalAuthors: getPostAuthors(
          versionData.additionalAuthors,
          additionalAuthorsEmails,
        ),
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        manuscriptFile: versionData.manuscriptFile!,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        keyResourceTable: versionData.keyResourceTable!,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        complianceReportResponse: versionData.complianceReportResponse!,
        url: urlValue,
      };
      try {
        if (!manuscriptId) {
          await onCreate({
            ...data,
            url: urlValue,
            preprintDate: preprintDateValue,
            publicationDate: publicationDateValue,
            impact: data.impact?.value,
            categories:
              data.categories?.map((category) => category.value) || [],
            ...(isProjectManuscript ? { projectId } : { teamId }),
            eligibilityReasons: [...eligibilityReasons],
            versions: [
              {
                ...requestVersionData,
                ...versionDataPayload,
              },
            ],
          });
        } else if (resubmitManuscript) {
          await onResubmit(manuscriptId, {
            title: data.title,
            url: urlValue,
            impact: data.impact?.value,
            preprintDate: preprintDateValue,
            publicationDate: publicationDateValue,
            categories:
              data.categories?.map((category) => category.value) || [],
            layImpactStatement: data.layImpactStatement,
            ...(isProjectManuscript ? { projectId } : { teamId }),
            versions: [
              {
                ...requestVersionData,
                ...versionDataPayload,
              },
            ],
          });
        } else {
          await onUpdate(manuscriptId, {
            title: data.title,
            url: urlValue,
            impact: data.impact?.value,
            preprintDate: preprintDateValue,
            publicationDate: publicationDateValue,
            categories:
              data.categories?.map((category) => category.value) || [],
            layImpactStatement: data.layImpactStatement,
            ...(isProjectManuscript ? { projectId } : { teamId }),
            versions: [
              {
                ...requestVersionData,
                ...versionDataPayload,
              },
            ],
          });
        }
        onSuccess();
      } catch (error) {
        if (
          (error as ManuscriptError).statusCode === 422 &&
          (error as ManuscriptError).response?.message ===
            'Title must be unique'
        ) {
          const { team, manuscriptId: id } = (error as ManuscriptError).response
            ?.data as {
            team: string;
            manuscriptId: string;
          };
          setError('title', {
            message: `A manuscript with this title has already been submitted for Team ${team} (${id}). Please use the edit or resubmission button to update this manuscript.`,
          });
        }
        onError(error as ManuscriptError | Error);
      } finally {
        setModal(null);
        setIsSubmitting(false);
      }
    }
  };

  const lifecycleSuggestions = useMemo(
    () =>
      watchType === ''
        ? []
        : manuscriptTypeLifecycles
            .filter(({ types }) => types.includes(watchType))
            .map(({ lifecycle: lifecycleSuggestion }) => ({
              value: lifecycleSuggestion,
              label: lifecycleSuggestion,
            })),
    [watchType],
  );

  const [modal, setModal] = useState<'submit' | 'cancel' | null>(null);
  const handleSubmitConfirmation = () => setModal('submit');
  const handleCancelConfirmation = () => setModal('cancel');

  const isURLRequired = useMemo(
    () =>
      watchLifecycle &&
      manuscriptLifecycleRequiredURL.includes(
        watchLifecycle as ManuscriptLifecycle,
      ),
    [watchLifecycle],
  );

  const handleInvalid = async () => {
    await trigger();
    const scrollableContainer = formRef.current?.closest('main');
    if (scrollableContainer) {
      scrollableContainer.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    onInvalid?.();
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    hasAttemptedSubmitRef.current = true;
    void handleSubmit(handleSubmitConfirmation, handleInvalid)(event);
  };

  return (
    <form ref={formRef} onSubmit={handleFormSubmit} noValidate>
      <Suspense fallback={<div>Loading modals...</div>}>
        <ManuscriptFormModals
          isSubmitting={isSubmitting}
          modal={modal}
          handleSubmit={handleSubmit(onSubmit)}
          setModal={setModal}
          isEditMode={isEditMode}
        />
      </Suspense>
      <main css={mainStyles}>
        <div css={contentStyles}>
          <FormCard title="What are you sharing?">
            <Controller
              name="title"
              control={control}
              rules={{
                required: 'Please enter a title.',
                maxLength: {
                  value: 256,
                  message: 'This title cannot exceed 256 characters.',
                },
              }}
              render={({
                field: { value, onChange, onBlur },
                fieldState: { error },
              }) => (
                <LabeledTextField
                  title="Title of Manuscript"
                  subtitle="(required)"
                  customValidationMessage={error?.message}
                  value={value}
                  onChange={onChange}
                  onBlur={onBlur}
                  enabled={!isSubmitting}
                />
              )}
            />

            <Controller
              name="versions.0.type"
              control={control}
              rules={{
                required: 'This field is required.',
              }}
              render={({
                field: { value, onChange, onBlur },
                fieldState: { error },
              }) => (
                <LabeledDropdown<ManuscriptType | ''>
                  title="Type of Manuscript"
                  subtitle="(required)"
                  description="Select the type that matches your manuscript the best."
                  options={manuscriptTypes.map((option) => ({
                    value: option,
                    label: option,
                  }))}
                  onChange={(e) => {
                    onChange(e);
                    // Clear lifecycle when type changes to prevent mismatched states
                    setValue('versions.0.lifecycle', '');
                  }}
                  onBlur={onBlur}
                  customValidationMessage={error?.message}
                  value={value}
                  enabled={
                    (!isEditMode || isOpenScienceTeamMember) && !isSubmitting
                  }
                  noOptionsMessage={(option) =>
                    `Sorry, no types match ${option.inputValue}`
                  }
                  placeholder="Choose a type of manuscript"
                />
              )}
            />
            {watchType && (
              <Suspense fallback={<div>Loading lifecycle...</div>}>
                <Controller
                  name="versions.0.lifecycle"
                  control={control}
                  rules={{
                    required: 'This field is required.',
                  }}
                  render={({
                    field: { value, onChange, onBlur },
                    fieldState: { error },
                  }) => (
                    <LabeledDropdown<ManuscriptLifecycle | ''>
                      title="Where is the manuscript in the life cycle?"
                      subtitle="(required)"
                      description="Select the option that matches your manuscript the best."
                      options={lifecycleSuggestions}
                      onChange={(lifecycleEvent) => {
                        onChange(lifecycleEvent);

                        // Update optional fields based on new selections
                        if (watchType && lifecycleEvent) {
                          updateOptionalFields(
                            watchType as ManuscriptType,
                            lifecycleEvent as ManuscriptLifecycle,
                          );
                        }
                      }}
                      onBlur={onBlur}
                      customValidationMessage={error?.message}
                      value={value}
                      enabled={
                        (!isEditMode || isOpenScienceTeamMember) &&
                        !isSubmitting
                      }
                      noOptionsMessage={(option: { inputValue: string }) =>
                        `Sorry, no options match ${option.inputValue}`
                      }
                      placeholder="Choose an option"
                    />
                  )}
                />
              </Suspense>
            )}

            {showPreprintDateField && (
              <Suspense fallback={<div>Loading preprint date...</div>}>
                <Controller
                  name="preprintDate"
                  control={control}
                  rules={{
                    required: isPreprintDateRequired
                      ? 'This field is required.'
                      : false,
                  }}
                  render={({
                    field: { value, onChange },
                    fieldState: { error },
                  }) => (
                    <LabeledDateInput
                      title="Preprint Date"
                      subtitle={
                        isPreprintDateRequired ? '(required)' : '(optional)'
                      }
                      description={preprintDateFieldDescription}
                      onChange={onChange}
                      value={value}
                      enabled={!isSubmitting && shouldEnablePreprintDateField}
                      customValidationMessage={error?.message}
                    />
                  )}
                />
              </Suspense>
            )}

            {showPublicationDateField && (
              <Suspense fallback={<div>Loading publication date...</div>}>
                <Controller
                  name="publicationDate"
                  control={control}
                  rules={{
                    required: isPublicationDateRequired
                      ? 'This field is required.'
                      : false,
                  }}
                  render={({
                    field: { value, onChange },
                    fieldState: { error },
                  }) => (
                    <LabeledDateInput
                      title="Publication Date"
                      subtitle={
                        isPublicationDateRequired ? '(required)' : '(optional)'
                      }
                      description={publicationDateFieldDescription}
                      onChange={onChange}
                      value={value}
                      enabled={
                        !isSubmitting && shouldEnablePublicationDateField
                      }
                      customValidationMessage={error?.message}
                    />
                  )}
                />
              </Suspense>
            )}

            <Controller
              name="url"
              control={control}
              rules={{
                required: isURLRequired ? 'Please enter a URL.' : false,
                pattern: {
                  value: new RegExp(urlExpression),
                  message: 'Please enter a valid URL, starting with http://',
                },
              }}
              render={({
                field: { value, onChange, onBlur },
                fieldState: { error },
              }) => (
                <LabeledTextField
                  title="URL"
                  subtitle={isURLRequired ? '(required)' : '(optional)'}
                  value={value ?? ''}
                  onChange={onChange}
                  onBlur={onBlur}
                  enabled={!isSubmitting && shouldEnableUrlField}
                  customValidationMessage={error?.message}
                  labelIndicator={<GlobeIcon />}
                  placeholder="https://example.com"
                />
              )}
            />

            {watchType &&
              watchLifecycle &&
              manuscriptFormFieldsMapping[watchType][watchLifecycle].includes(
                'preprintDoi',
              ) && (
                <Suspense fallback={<div>Loading preprint DOI...</div>}>
                  <Controller
                    name="versions.0.preprintDoi"
                    control={control}
                    rules={{
                      pattern: {
                        value: /^10\.\d{4}.*$/,
                        message: 'Please enter a valid DOI starting with “10.”',
                      },
                      required:
                        watchLifecycle === 'Preprint' &&
                        'Please enter a Preprint DOI.',
                    }}
                    render={({
                      field: { value, onChange, onBlur },
                      fieldState: { error },
                    }) => (
                      <LabeledTextField
                        title="Preprint DOI"
                        subtitle={
                          watchLifecycle === 'Preprint'
                            ? '(required)'
                            : '(optional)'
                        }
                        description="Your preprint DOI must start with 10."
                        onChange={onChange}
                        onBlur={onBlur}
                        customValidationMessage={error?.message}
                        value={value ?? ''}
                        enabled={
                          (!isEditMode || isOpenScienceTeamMember) &&
                          !isSubmitting
                        }
                        placeholder="e.g. 10.5555/YFRU1371"
                      />
                    )}
                  />
                </Suspense>
              )}

            {watchType &&
              watchLifecycle &&
              manuscriptFormFieldsMapping[watchType][watchLifecycle].includes(
                'publicationDoi',
              ) && (
                <Suspense fallback={<div>Loading publication DOI...</div>}>
                  <Controller
                    name="versions.0.publicationDoi"
                    control={control}
                    rules={{
                      pattern: {
                        value: /^10\.\d{4}.*$/,
                        message: 'Please enter a valid DOI starting with “10.”',
                      },
                      required: 'Please enter a Publication DOI.',
                    }}
                    render={({
                      field: { value, onChange, onBlur },
                      fieldState: { error },
                    }) => (
                      <LabeledTextField
                        title="Publication DOI"
                        subtitle={'(required)'}
                        description="Your publication DOI must start with 10."
                        onChange={onChange}
                        onBlur={onBlur}
                        customValidationMessage={error?.message}
                        value={value ?? ''}
                        enabled={
                          (!isEditMode || isOpenScienceTeamMember) &&
                          !isSubmitting
                        }
                        placeholder="e.g. 10.5555/YFRU1371"
                      />
                    )}
                  />
                </Suspense>
              )}

            {watchType &&
              watchLifecycle &&
              manuscriptFormFieldsMapping[watchType][watchLifecycle].includes(
                'otherDetails',
              ) && (
                <Suspense fallback={<div>Loading other details...</div>}>
                  <Controller
                    name="versions.0.otherDetails"
                    control={control}
                    rules={{
                      required: 'Please enter the relevant details.',
                      maxLength: {
                        value: 256,
                        message: 'Details cannot exceed 256 characters.',
                      },
                    }}
                    render={({
                      field: { value, onChange, onBlur },
                      fieldState: { error },
                    }) => (
                      <LabeledTextField
                        title="Please provide details"
                        subtitle={'(required)'}
                        onChange={onChange}
                        onBlur={onBlur}
                        customValidationMessage={error?.message}
                        value={value ?? ''}
                        enabled={
                          (!isEditMode || isOpenScienceTeamMember) &&
                          !isSubmitting
                        }
                      />
                    )}
                  />
                </Suspense>
              )}

            <Suspense fallback={<div>Loading description...</div>}>
              <Controller
                name="versions.0.description"
                control={control}
                rules={{
                  required: 'Please enter a manuscript description.',
                }}
                render={({
                  field: { value, onChange, onBlur },
                  fieldState: { error },
                }) => (
                  <LabeledTextArea
                    title="Manuscript Description"
                    subtitle="(required)"
                    tip={
                      <span>
                        Please provide a description of the outcomes of your
                        paper and how it relates to your ASAP project (view
                        example{' '}
                        <Link href="https://docs.google.com/document/d/1dU8VLqKjyJM_tBNWpxAAJyoALknQgbRlKm5PdqopFUM/edit">
                          here
                        </Link>
                        ).
                      </span>
                    }
                    customValidationMessage={error?.message}
                    value={value || ''}
                    onChange={onChange}
                    onBlur={onBlur}
                    enabled={!isSubmitting}
                  />
                )}
              />
            </Suspense>
            <Suspense fallback={<div>Loading short description...</div>}>
              <Controller
                name="versions.0.shortDescription"
                control={control}
                rules={{
                  required:
                    'Please enter a short description or select Generate to create one.',
                  maxLength: {
                    value: 250,
                    message:
                      'The short description exceeds the character limit. Please limit it to 250 characters.',
                  },
                }}
                render={({
                  field: { value, onChange },
                  fieldState: { error },
                }) => (
                  <ShortDescriptionCard
                    buttonEnabled={!!watch('versions.0.description')}
                    enabled={!isSubmitting}
                    onChange={async (e) => {
                      onChange(e);
                      await trigger('versions.0.shortDescription');
                    }}
                    value={value}
                    customValidationMessage={error?.message}
                    tip="Use AI to generate a short description or write your own based on the description field above."
                    getShortDescription={() =>
                      getShortDescriptionFromDescription(
                        watch('versions.0.description'),
                      )
                    }
                  />
                )}
              />
            </Suspense>
            <div
              css={css({
                marginTop: rem(12),
              })}
            >
              <Suspense fallback={<div>Loading categories...</div>}>
                <Controller
                  name="categories"
                  control={control}
                  rules={{
                    required: 'This field is required.',
                    validate: (value) => {
                      if (value.length > 2) {
                        return 'You can select up to two categories only.';
                      }
                      return true;
                    },
                  }}
                  render={({
                    field: { value, onChange, onBlur },
                    fieldState: { error },
                  }) => (
                    <LabeledMultiSelect
                      title="Category"
                      description="Select up to two options that best describe the scientific category of this manuscript."
                      subtitle="(required)"
                      placeholder="Choose a category"
                      loadOptions={getCategorySuggestions}
                      isMulti={true}
                      onChange={(selectedOptions: MultiSelectOptionsType) => {
                        onChange(selectedOptions);
                      }}
                      customValidationMessage={error?.message}
                      values={value}
                      noOptionsMessage={({
                        inputValue,
                      }: {
                        inputValue: string;
                      }) => `Sorry, no categories match ${inputValue}`}
                      enabled={!isSubmitting}
                      onBlur={onBlur}
                    />
                  )}
                />
              </Suspense>
            </div>
            <div
              css={css({
                marginTop: rem(12),
              })}
            >
              <Suspense fallback={<div>Loading impact...</div>}>
                <Controller
                  name="impact"
                  control={control}
                  rules={{
                    required: 'This field is required.',
                  }}
                  render={({
                    field: { value, onChange, onBlur },
                    fieldState: { error },
                  }) => (
                    <LabeledDropdown
                      title="Impact"
                      subtitle="(required)"
                      description="Select the option that best describes the impact of this manuscript on the PD field."
                      options={impactOptions}
                      onChange={(e) => {
                        const impactOption = impactOptions.find(
                          (option) => option.value === e,
                        );
                        onChange(impactOption);
                      }}
                      onBlur={onBlur}
                      customValidationMessage={error?.message}
                      value={value?.value}
                      enabled={!isSubmitting}
                      noOptionsMessage={(option) =>
                        `Sorry, no impacts match ${option.inputValue}`
                      }
                      placeholder="Choose an impact"
                    />
                  )}
                />
              </Suspense>
            </div>
            <Suspense fallback={<div>Loading lay impact statement...</div>}>
              <Controller
                name="layImpactStatement"
                control={control}
                rules={{
                  required: 'Please enter a lay impact statement.',
                  maxLength: {
                    value: 100,
                    message:
                      'The lay impact statement exceeds the character limit. Please limit it to 100 characters.',
                  },
                }}
                render={({
                  field: { value, onChange, onBlur },
                  fieldState: { error },
                }) => (
                  <LabeledTextArea
                    title="Lay Impact Statement"
                    subtitle="(required)"
                    tip={
                      <span>
                        Explain in plain language why this work matters and how
                        it may impact research, patients, or the wider
                        community.
                      </span>
                    }
                    customValidationMessage={error?.message}
                    value={value || ''}
                    onChange={onChange}
                    onBlur={onBlur}
                    enabled={!isSubmitting}
                  />
                )}
              />
            </Suspense>
          </FormCard>
          <Suspense fallback={<div>Loading manuscript files...</div>}>
            <FormCard key="manuscriptFiles" title="Manuscript Files">
              <Suspense fallback={<div>Loading manuscript file...</div>}>
                <Controller
                  name="versions.0.manuscriptFile"
                  control={control}
                  rules={{
                    required: 'Please upload the main manuscript file.',
                  }}
                  render={({ field: { value }, fieldState: { error } }) => (
                    <LabeledFileField
                      title="Upload the main manuscript file"
                      subtitle="(required)"
                      description="The main manuscript must be submitted as a single PDF file and should contain all primary and supplemental text, methods, and figures. The file size must not exceed 100 MB."
                      placeholder="Upload Manuscript File"
                      onRemove={async () => {
                        resetField('versions.0.manuscriptFile', {
                          defaultValue: null,
                        });
                        await trigger('versions.0.manuscriptFile');
                      }}
                      handleFileUpload={async (file: File) => {
                        if (file.size > MAX_FILE_SIZE) {
                          setError('versions.0.manuscriptFile', {
                            type: 'custom',
                            message:
                              'The file size exceeds the limit of 100 MB. Please upload a smaller file.',
                          });
                        } else {
                          setIsUploadingManuscriptFile(true);
                          clearErrors('versions.0.manuscriptFile');

                          const uploadedFile = await handleFileUpload(
                            file,
                            'Manuscript File',
                            (validationErrorMessage) => {
                              setError('versions.0.manuscriptFile', {
                                type: 'custom',
                                message: validationErrorMessage,
                              });
                            },
                          );
                          setIsUploadingManuscriptFile(false);

                          if (!uploadedFile) return;

                          setValue('versions.0.manuscriptFile', uploadedFile, {
                            shouldValidate: true,
                          });
                        }
                      }}
                      currentFiles={value ? [value] : []}
                      accept="application/pdf"
                      customValidationMessage={error?.message}
                      enabled={
                        (!isEditMode || isOpenScienceTeamMember) &&
                        !isSubmitting &&
                        !isUploadingManuscriptFile
                      }
                      tagEnabled={!isEditMode || isOpenScienceTeamMember}
                    />
                  )}
                />
              </Suspense>
              {watchType &&
                watchLifecycle &&
                manuscriptFormFieldsMapping[watchType][watchLifecycle].includes(
                  'keyResourceTable',
                ) && (
                  <Suspense fallback={<div>Loading key resource table...</div>}>
                    <Controller
                      name="versions.0.keyResourceTable"
                      control={control}
                      rules={{
                        required: 'Please upload a key resource table.',
                      }}
                      render={({ field: { value }, fieldState: { error } }) => (
                        <LabeledFileField
                          title="Upload a key resource table"
                          subtitle="(required)"
                          description={
                            <>
                              The key resource table must be submitted as a
                              single CSV file and should outline the resources
                              used and generated in this study. View guidance{' '}
                              {<Link href={KRT_GUIDANCE_FILE}>here</Link>}. The
                              file size must not exceed 100 MB.
                            </>
                          }
                          placeholder="Upload Key Resource Table"
                          onRemove={async () => {
                            resetField('versions.0.keyResourceTable', {
                              defaultValue: null,
                            });
                            await trigger('versions.0.keyResourceTable');
                          }}
                          handleFileUpload={async (file: File) => {
                            if (file.size > MAX_FILE_SIZE) {
                              setError('versions.0.keyResourceTable', {
                                type: 'custom',
                                message:
                                  'The file size exceeds the limit of 100 MB. Please upload a smaller file.',
                              });
                            } else {
                              setIsUploadingKeyResourceTable(true);
                              clearErrors('versions.0.keyResourceTable');

                              const uploadedFile = await handleFileUpload(
                                file,
                                'Key Resource Table',
                                (validationErrorMessage) => {
                                  setError('versions.0.keyResourceTable', {
                                    type: 'custom',
                                    message: validationErrorMessage,
                                  });
                                },
                              );
                              setIsUploadingKeyResourceTable(false);

                              if (!uploadedFile) return;

                              setValue(
                                'versions.0.keyResourceTable',
                                uploadedFile,
                                {
                                  shouldValidate: true,
                                },
                              );
                            }
                          }}
                          currentFiles={value ? [value] : []}
                          accept="text/csv"
                          customValidationMessage={error?.message}
                          enabled={
                            (!isEditMode || isOpenScienceTeamMember) &&
                            !isSubmitting &&
                            !isUploadingKeyResourceTable
                          }
                          tagEnabled={!isEditMode || isOpenScienceTeamMember}
                        />
                      )}
                    />
                  </Suspense>
                )}
              {canSubmitComplianceReportResponse && (
                <Suspense
                  fallback={<div>Loading compliance report response...</div>}
                >
                  <Controller
                    name="versions.0.complianceReportResponse"
                    control={control}
                    rules={{
                      required: 'Please upload a response.',
                    }}
                    render={({ field: { value }, fieldState: { error } }) => (
                      <LabeledFileField
                        title="Upload a response to the compliance report"
                        subtitle="(required)"
                        description="The response must be submitted as a PDF or Word document and must include an itemized explanation of how each comment in the compliance report has been addressed (as is often done in responses to peer reviews). Maximum file size: 100 MB."
                        placeholder="Upload Compliance Report Response"
                        onRemove={async () => {
                          resetField('versions.0.complianceReportResponse', {
                            defaultValue: null,
                          });
                          await trigger('versions.0.complianceReportResponse');
                        }}
                        handleFileUpload={async (file: File) => {
                          if (file.size > MAX_FILE_SIZE) {
                            setError('versions.0.complianceReportResponse', {
                              type: 'custom',
                              message:
                                'The file size exceeds the limit of 100 MB. Please upload a smaller file.',
                            });
                          } else {
                            setIsUploadingComplianceReportResponse(true);
                            clearErrors('versions.0.complianceReportResponse');

                            const uploadedFile = await handleFileUpload(
                              file,
                              'Compliance Report Response',
                              (validationErrorMessage) => {
                                setError(
                                  'versions.0.complianceReportResponse',
                                  {
                                    type: 'custom',
                                    message: validationErrorMessage,
                                  },
                                );
                              },
                            );
                            setIsUploadingComplianceReportResponse(false);

                            if (!uploadedFile) return;

                            setValue(
                              'versions.0.complianceReportResponse',
                              uploadedFile,
                              {
                                shouldValidate: true,
                              },
                            );
                          }
                        }}
                        currentFiles={value ? [value] : []}
                        accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        customValidationMessage={error?.message}
                        enabled={
                          (!isEditMode || isOpenScienceTeamMember) &&
                          !isSubmitting &&
                          !isUploadingComplianceReportResponse
                        }
                        tagEnabled={!isEditMode || isOpenScienceTeamMember}
                      />
                    )}
                  />
                </Suspense>
              )}
              <Suspense fallback={<div>Loading additional files...</div>}>
                <Controller
                  name="versions.0.additionalFiles"
                  control={control}
                  render={({ field: { value }, fieldState: { error } }) => (
                    <LabeledFileField
                      title="Upload any additional files"
                      subtitle="(optional)"
                      description={
                        <>
                          Additional files must be submitted in PDF and/or CSV
                          formats. The file size must not exceed 100 MB.
                        </>
                      }
                      placeholder="Upload Additional Files"
                      onRemove={(id?: string) => {
                        setValue(
                          'versions.0.additionalFiles',
                          value?.filter(
                            (additionalFile) => additionalFile.id !== id,
                          ),
                        );
                      }}
                      maxFiles={5}
                      handleFileUpload={async (file: File) => {
                        const isExistingFile =
                          value &&
                          value.findIndex(
                            (additionalFile) =>
                              additionalFile.filename === file.name,
                          ) !== -1;
                        if (!isExistingFile) {
                          if (file.size > MAX_FILE_SIZE) {
                            setError('versions.0.additionalFiles', {
                              type: 'custom',
                              message:
                                'The file size exceeds the limit of 100 MB. Please upload a smaller file.',
                            });
                          } else {
                            setIsUploadingAdditionalFiles(true);
                            clearErrors('versions.0.additionalFiles');

                            const uploadedFile = await handleFileUpload(
                              file,
                              'Additional Files',
                              (validationErrorMessage) => {
                                setError('versions.0.additionalFiles', {
                                  type: 'custom',
                                  message: validationErrorMessage,
                                });
                              },
                            );
                            setIsUploadingAdditionalFiles(false);

                            if (!uploadedFile) return;

                            setValue(
                              'versions.0.additionalFiles',
                              [
                                ...(getValues('versions.0.additionalFiles') ||
                                  []),
                                uploadedFile,
                              ],
                              {
                                shouldValidate: true,
                              },
                            );
                          }
                        } else {
                          setError('versions.0.additionalFiles', {
                            type: 'custom',
                            message: 'File uploaded already exists.',
                          });
                        }
                      }}
                      currentFiles={value}
                      customValidationMessage={error?.message}
                      accept="application/pdf,text/csv"
                      enabled={
                        (!isEditMode || isOpenScienceTeamMember) &&
                        !isSubmitting &&
                        !isUploadingAdditionalFiles
                      }
                      tagEnabled={!isEditMode || isOpenScienceTeamMember}
                    />
                  )}
                />
              </Suspense>
            </FormCard>
          </Suspense>
          <Suspense fallback={<div>Loading contributors...</div>}>
            <FormCard key="contributors" title="Who were the contributors?">
              {isProjectManuscript && (
                <Paragraph noMargin>
                  All authors added to this form will receive email updates
                  about this manuscript. <br /> Authors who are listed as a
                  member of your project on the CRN Hub will also be able to
                  edit the manuscript metadata and submit a new version of the
                  manuscript on the Hub. <br /> To add an author to your project
                  on the Hub, email{' '}
                  <Link href={mailToSupport()}> {TECH_SUPPORT_EMAIL}</Link>.
                </Paragraph>
              )}
              {!isProjectManuscript && (
                <Controller
                  name="versions.0.teams"
                  control={control}
                  rules={{
                    required: 'Please add at least one team.',
                    validate: validateTeams,
                  }}
                  render={({
                    field: { value, onChange },
                    fieldState: { error },
                  }) => (
                    <LabeledMultiSelect
                      title="Teams"
                      description="Add other teams that contributed to this manuscript. The Project Manager and Lead PI from all teams listed will receive updates. They will also be able to edit the manuscript metadata and submit a new version of the manuscript."
                      subtitle="(required)"
                      enabled={!isSubmitting}
                      placeholder="Start typing..."
                      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                      loadOptions={getTeamSuggestions!}
                      onChange={async (
                        selectedOptions: MultiSelectOptionsType,
                      ) => {
                        onChange(selectedOptions);
                        await trigger([
                          'versions.0.labs',
                          'versions.0.firstAuthors',
                          'versions.0.correspondingAuthor',
                          'versions.0.additionalAuthors',
                        ]);
                      }}
                      customValidationMessage={error?.message}
                      values={value}
                      noOptionsMessage={({
                        inputValue,
                      }: {
                        inputValue: string;
                      }) => `Sorry, no teams match ${inputValue}`}
                    />
                  )}
                />
              )}

              <ManuscriptAuthors
                isMultiSelect
                isRequired
                fieldName="firstAuthors"
                fieldTitle="First Author"
                fieldDescription={
                  isProjectManuscript
                    ? ''
                    : 'Add the name of the first author(s). First authors will receive updates. First authors who are active on the CRN Hub will be able to edit the manuscript metadata and can submit a new version of the manuscript.'
                }
                fieldEmailDescription="Provide a valid email address for the Non-CRN author."
                {...commonManuscriptAuthorProps}
                validate={validateFirstAuthors}
              />

              {!isProjectManuscript && (
                <Controller
                  name="versions.0.labs"
                  control={control}
                  rules={{
                    validate: validateLabPiTeams,
                  }}
                  render={({
                    field: { value, onBlur },
                    fieldState: { error },
                  }) => (
                    <LabeledMultiSelect
                      title="Labs"
                      description="Add ASAP labs that contributed to this manuscript. Only labs whose PI is part of the CRN will appear. PIs for each listed lab will receive an update on this manuscript. In addition, they will be able to edit the manuscript metadata and can submit a new version of the manuscript."
                      subtitle="(required)"
                      enabled={!isSubmitting}
                      placeholder="Start typing..."
                      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                      loadOptions={getLabSuggestions!}
                      onChange={
                        ((selectedOptions: MultiSelectOptionsType[] | null) => {
                          setValue('versions.0.labs', selectedOptions || [], {
                            shouldValidate: true,
                            shouldTouch: true,
                          });
                        }) as MultiSelectOnChange<MultiSelectOptionsType>
                      }
                      onBlur={onBlur}
                      values={value}
                      noOptionsMessage={({
                        inputValue,
                      }: {
                        inputValue: string;
                      }) => `Sorry, no labs match ${inputValue}`}
                      customValidationMessage={error?.message}
                    />
                  )}
                />
              )}

              <ManuscriptAuthors
                fieldName="correspondingAuthor"
                fieldTitle="Corresponding Author"
                fieldDescription={
                  isProjectManuscript
                    ? 'The corresponding author may be the same as the first author.'
                    : 'Add the corresponding author. The corresponding author will receive updates. Corresponding Author who are active on the CRN Hub will be able to edit the manuscript metadata and can submit a new version of the manuscript.'
                }
                fieldEmailDescription="Provide a valid email address for the Non-CRN author."
                {...commonManuscriptAuthorProps}
                validate={validateCorrespondingAuthor}
              />

              <ManuscriptAuthors
                isMultiSelect
                fieldName="additionalAuthors"
                fieldTitle="Additional Authors"
                fieldDescription={
                  isProjectManuscript
                    ? 'Add additional authors who should receive updates.'
                    : 'Add the names of any additional authors who should receive updates. These additional authors, who are active on the CRN Hub, will be able to edit the manuscript metadata and can submit a new version of the manuscript.'
                }
                fieldEmailDescription="Provide a valid email address for the Non-CRN author."
                {...commonManuscriptAuthorProps}
                validate={validateAdditionalAuthors}
              />
            </FormCard>
          </Suspense>
          {watchType && watchLifecycle && (
            <Suspense fallback={<div>Loading quick checks...</div>}>
              <FormCard
                key="quick-checks"
                title="Quick Checks"
                description={
                  <p>
                    Before you submit your manuscript, please confirm that you
                    have met the following requirements. For a more detailed
                    explanation, please refer to the&nbsp;
                    <Link href="https://docs.google.com/document/d/1rkAsm9UrElP8OhXCdxQXKxNGWz4HsOAIXrYtfxAn7kI">
                      <span
                        css={css({
                          wordBreak: 'break-word',
                          position: 'relative',
                          '& svg': {
                            position: 'absolute',
                            bottom: '1px',
                          },
                        })}
                      >
                        Open Science Compliance Checklist for Authors
                        <ExternalLinkIcon
                          size={17}
                          color={colors.colour.brand.crn[800]}
                        />
                      </span>
                    </Link>
                  </p>
                }
              >
                <div
                  css={css({
                    display: 'flex',
                    flexDirection: 'column',
                    gap: rem(48),
                    paddingTop: rem(8),
                    paddingBottom: rem(8),
                  })}
                >
                  {quickCheckQuestions.map(
                    ({ field, question }) =>
                      manuscriptFormFieldsMapping[watchType][
                        watchLifecycle
                      ].includes(field) && (
                        <div key={field}>
                          <Controller
                            name={`versions.0.${field}`}
                            control={control}
                            rules={{
                              required: 'Please select an option.',
                            }}
                            render={({
                              field: { value, onChange },
                              fieldState: { error },
                            }) => (
                              <LabeledRadioButtonGroup<
                                QuestionChecksOption | ''
                              >
                                testId={field}
                                title={question}
                                subtitle="(required)"
                                description={getQuickCheckDescription(field)}
                                options={[
                                  {
                                    value: 'Yes',
                                    label: 'Yes',
                                    disabled: isEditMode || isSubmitting,
                                  },
                                  {
                                    value: 'No',
                                    label: 'No',
                                    disabled: isEditMode || isSubmitting,
                                  },
                                  {
                                    value: 'Not applicable',
                                    label: 'Not applicable',
                                    disabled: isEditMode || isSubmitting,
                                  },
                                ]}
                                value={value as QuestionChecksOption}
                                onChange={onChange}
                                validationMessage={error?.message ?? ''}
                              />
                            )}
                          />
                          {['No', 'Not applicable'].includes(
                            watch(`versions.0.${field}`) as string,
                          ) && (
                            <div
                              css={css({
                                marginTop: rem(12),
                              })}
                            >
                              <Controller
                                name={`versions.0.${field}Details`}
                                control={control}
                                rules={{
                                  required: 'Please enter the details.',
                                  maxLength: {
                                    value: 256,
                                    message:
                                      'Reason cannot exceed 256 characters.',
                                  },
                                }}
                                render={({
                                  field: { value, onChange, onBlur },
                                  fieldState: { error },
                                }) => (
                                  <LabeledTextField
                                    title="Please provide details"
                                    subtitle="(required)"
                                    description="The reason you provide must be accepted by the Open Science team."
                                    value={value || ''}
                                    customValidationMessage={error?.message}
                                    onChange={onChange}
                                    enabled={!isEditMode && !isSubmitting}
                                    onBlur={onBlur}
                                  />
                                )}
                              />
                            </div>
                          )}
                        </div>
                      ),
                  )}
                </div>
              </FormCard>
            </Suspense>
          )}
          <div css={buttonsOuterContainerStyles}>
            <div css={buttonsInnerContainerStyles}>
              <Button
                noMargin
                enabled={!isSubmitting}
                onClick={handleCancelConfirmation}
              >
                Cancel
              </Button>
              <Button
                primary
                noMargin
                enabled={!isSubmitting}
                preventDefault={false}
              >
                Submit
              </Button>
            </div>
          </div>
        </div>
      </main>
    </form>
  );
};

export default memo(ManuscriptForm);
