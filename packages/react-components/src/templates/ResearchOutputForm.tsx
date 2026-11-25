import {
  EventResponse,
  getResearchOutputFlowBehavior,
  isServerValidationError,
  ResearchOutputDocumentType,
  ResearchOutputFlowId,
  ResearchOutputPostRequest,
  ResearchOutputResponse,
  ResearchTagResponse,
} from '@asap-hub/model';
import { css } from '@emotion/react';

import {
  InnerToastContext,
  ResearchOutputAvailableActions,
  ResearchOutputPermissions,
} from '@asap-hub/react-context';
import { sharedResearch } from '@asap-hub/routing';
import React, {
  ComponentProps,
  FormEvent,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Controller, FieldPath, FormProvider, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';

import { MultiSelectOptionsType } from '../atoms';
import { defaultPageLayoutPaddingStyle } from '../layout';
import { useNavigationWarning } from '../navigation';
import {
  ResearchOutputConfirmModal,
  ResearchOutputConfirmModalType,
  ResearchOutputExtraInformationCard,
  ResearchOutputFormActions,
  ResearchOutputFormSharingCard,
  ResearchOutputPublishingCard,
  ResearchOutputRelatedEventsCard,
} from '../organisms';
import ResearchOutputContributorsCard, {
  AuthorRestriction,
} from '../organisms/ResearchOutputContributorsCard';
import ResearchOutputRelatedResearchCard from '../organisms/ResearchOutputRelatedResearchCard';
import { rem } from '../pixels';

import {
  getIconForDocumentType,
  getPayload,
  getResearchOutputFormDefaultValues,
  noop,
  ResearchOutputFormValues,
} from '../utils';
import { richTextToMarkdown } from '../utils/parsing';
import { SeenModalType } from '../organisms/ResearchOutputConfirmModal';

type ResearchOutputFormProps = Pick<
  ComponentProps<typeof ResearchOutputFormSharingCard>,
  | 'typeOptions'
  | 'urlRequired'
  | 'getShortDescriptionFromDescription'
  | 'getImpactSuggestions'
  | 'getCategorySuggestions'
> &
  Pick<
    ComponentProps<typeof ResearchOutputContributorsCard>,
    | 'getLabSuggestions'
    | 'getAuthorSuggestions'
    | 'getTeamSuggestions'
    | 'authorsRequired'
    | 'validateContributorTeams'
  > & {
    versionAction?: 'create' | 'edit';
    projectMemberIds?: ReadonlyArray<string>;
    onSave: (
      output: ResearchOutputPostRequest,
    ) => Promise<ResearchOutputResponse | void>;
    onSaveDraft: (
      output: ResearchOutputPostRequest,
    ) => Promise<ResearchOutputResponse | void>;
    published: boolean;
    documentType: ResearchOutputDocumentType;
    researchTags: ResearchTagResponse[];
    selectedTeams: ResearchOutputFormValues['teams'];
    getRelatedResearchSuggestions?: NonNullable<
      ComponentProps<
        typeof ResearchOutputRelatedResearchCard
      >['getRelatedResearchSuggestions']
    >;
    getRelatedEventSuggestions: NonNullable<
      ComponentProps<
        typeof ResearchOutputRelatedEventsCard
      >['getRelatedEventSuggestions']
    >;
    researchOutputData?: ResearchOutputResponse;
    tagSuggestions: string[];
    permissions: ResearchOutputPermissions;
    isImportedFromManuscript?: boolean;
    flowId: ResearchOutputFlowId;
    availableActions: ResearchOutputAvailableActions;
  };

const mainStyles = css({
  padding: defaultPageLayoutPaddingStyle,
});

const serverErrorMessages: Record<
  string,
  { name: FieldPath<ResearchOutputFormValues>; message: string }
> = {
  '/title': {
    name: 'title',
    message:
      'A Research Output with this title already exists. Please check if this is repeated and choose a different title.',
  },
  '/link': {
    name: 'link',
    message:
      'A Research Output with this URL already exists. Please enter a different URL.',
  },
};

const formErrorMessage =
  'There are some errors in the form. Please correct the fields below.';
const saveErrorMessage =
  'There was an error and we were unable to save your changes. Please try again.';

const contentStyles = css({
  display: 'grid',
  gridTemplateColumns: '1fr',
  maxWidth: rem(800),
  justifyContent: 'center',
  gridAutoFlow: 'row',
  rowGap: rem(32),
  margin: 'auto',
});

const ResearchOutputForm: React.FC<ResearchOutputFormProps> = ({
  documentType,
  researchOutputData,
  onSave,
  onSaveDraft,
  tagSuggestions,
  urlRequired = true,
  authorsRequired = false,
  validateContributorTeams = false,
  projectMemberIds,
  typeOptions,
  selectedTeams,
  getLabSuggestions = noop,
  getTeamSuggestions = noop,
  getAuthorSuggestions = noop,
  getImpactSuggestions,
  getCategorySuggestions = noop,
  getRelatedResearchSuggestions = noop,
  getRelatedEventSuggestions,
  getShortDescriptionFromDescription,
  researchTags,
  published,
  permissions,
  versionAction,
  isImportedFromManuscript,
  flowId,
  availableActions,
}) => {
  const toast = useContext(InnerToastContext);
  const formRef = useRef<HTMLFormElement>(null);

  const navigate = useNavigate();
  const { canPublishResearchOutput } = permissions;

  const behavior = getResearchOutputFlowBehavior(flowId);

  const authorRestriction: AuthorRestriction =
    availableActions.restrictAuthorsToProjectMembers && projectMemberIds
      ? { kind: 'project-members', memberIds: projectMemberIds }
      : { kind: 'none' };

  const showSaveDraftButton = availableActions.canSaveDraft;

  const showPublishButton = !!canPublishResearchOutput;

  const defaultValues = useMemo(
    () =>
      getResearchOutputFormDefaultValues({
        researchOutputData,
        selectedTeams,
        versionAction,
        documentType,
        isCreateFlow: behavior.isCreateFlow,
        descriptionMD:
          researchOutputData?.descriptionMD ||
          richTextToMarkdown(researchOutputData?.description),
        isImportedFromManuscript,
      }),
    [
      researchOutputData,
      selectedTeams,
      versionAction,
      documentType,
      behavior.isCreateFlow,
      isImportedFromManuscript,
    ],
  );

  const methods = useForm<ResearchOutputFormValues>({
    mode: 'all',
    defaultValues,
  });
  const {
    watch,
    getValues,
    control,
    reset,
    setError,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = methods;

  const [savingAction, setSavingAction] = useState<'draft' | 'publish' | null>(
    null,
  );
  const isSaving = isSubmitting || savingAction !== null;

  const { blockedNavigate } = useNavigationWarning({
    shouldBlock: isDirty || isSaving,
  });

  const handleCancel = () => {
    if (window.history.length > 1) {
      void blockedNavigate(-1);
    } else {
      void blockedNavigate('/');
    }
  };

  const type = watch('type');
  const descriptionMD = watch('descriptionMD');

  const [alreadySeenModals, setAlreadySeenModals] = useState<
    Set<SeenModalType>
  >(() => new Set());

  const isModalAlreadySeen = (modal: SeenModalType) =>
    alreadySeenModals.has(modal);

  const promptDescriptionChange =
    descriptionMD === researchOutputData?.descriptionMD &&
    behavior.requiresSameDescriptionConfirm &&
    !isModalAlreadySeen('description-change');

  const promptNewVersion =
    behavior.requiresAddVersionConfirm && !isModalAlreadySeen('version');

  const [modal, setModal] = useState<ResearchOutputConfirmModalType>(null);

  const getDraftModal: () => ResearchOutputConfirmModalType = () =>
    promptDescriptionChange ? 'description-draft' : null;

  const getPublishModal: () => ResearchOutputConfirmModalType = () => {
    if (promptDescriptionChange) return 'description-publish';
    if (promptNewVersion) return 'version';
    if (behavior.requiresPublishConfirm) return 'confirm-publish';
    return null;
  };

  const filteredResearchTags =
    type !== undefined
      ? researchTags.filter((d) => d.types?.includes(type))
      : [];

  const toPayload = (values: ResearchOutputFormValues) =>
    getPayload({
      identifierType: values.identifierType,
      identifier: values.identifier,
      documentType,
      link: values.link,
      description: researchOutputData?.description || '',
      descriptionMD: values.descriptionMD,
      shortDescription: values.shortDescription,
      changelog: values.changelog,
      title: values.title,
      type: values.type,
      authors: values.authors,
      labs: values.labs,
      teams: values.teams,
      relatedResearch: values.relatedResearch,
      usageNotes: values.usageNotes,
      asapFunded: values.asapFunded,
      usedInPublication: values.usedInPublication,
      sharingStatus: values.sharingStatus,
      publishDate: values.publishDate,
      labCatalogNumber: values.labCatalogNumber,
      methods: values.methods,
      organisms: values.organisms,
      environments: values.environments,
      subtype: values.subtype || undefined,
      keywords: values.keywords,
      published,
      relatedEvents: values.relatedEvents,
      impact: (values.impact as MultiSelectOptionsType)?.value,
      layImpactStatement: values.layImpactStatement,
      categories: (values.categories as MultiSelectOptionsType[]).map(
        (category) => category.value,
      ),
    });

  const requestedActionRef = useRef<'draft' | 'publish' | null>(null);

  const requestAction = (actionType: 'draft' | 'publish') => {
    requestedActionRef.current = actionType;
  };

  const withSavingAction = async <T,>(
    actionType: 'draft' | 'publish',
    run: () => Promise<T>,
  ) => {
    setSavingAction(actionType);
    try {
      return await run();
    } finally {
      setSavingAction(null);
    }
  };

  const navigateToDetailPage = (id: string, successToastType?: string) => {
    const detailPageUrl = sharedResearch({}).researchOutput({
      researchOutputId: id,
    }).$;
    const locationState = successToastType
      ? { toast: successToastType }
      : undefined;

    void navigate(detailPageUrl, {
      state: locationState,
    });
  };

  const handleAction = async (
    getModal: () => ResearchOutputConfirmModalType,
    action: () => Promise<void | ResearchOutputResponse>,
  ) => {
    const nextModal = getModal();

    if (nextModal) {
      setModal(nextModal);
    } else {
      await action();
    }
  };

  const reportFormError = (message: string) => {
    const scrollableContainer = formRef.current?.closest('main');
    if (scrollableContainer) {
      scrollableContainer.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    toast(message);
  };

  const applyServerValidationErrors = (error: unknown) => {
    if (!isServerValidationError(error)) return false;

    const fieldErrors = error.validationErrors.flatMap(
      ({ instancePath }) => serverErrorMessages[instancePath] ?? [],
    );
    fieldErrors.forEach(({ name, message }) =>
      setError(name, { type: 'server', message }),
    );

    return fieldErrors.length > 0;
  };

  const persist = async (
    action: (
      output: ResearchOutputPostRequest,
    ) => Promise<ResearchOutputResponse | void>,
    successToastType?: string,
  ) => {
    const values = getValues();

    let researchOutput;
    try {
      researchOutput = await action(toPayload(values));
    } catch (error) {
      reportFormError(
        applyServerValidationErrors(error)
          ? formErrorMessage
          : saveErrorMessage,
      );
      return undefined;
    }

    if (!researchOutput) {
      reportFormError(saveErrorMessage);
      return undefined;
    }

    reset(values);
    navigateToDetailPage(researchOutput.id, successToastType);

    return researchOutput;
  };

  const saveDraft = () =>
    withSavingAction('draft', () =>
      persist(
        onSaveDraft,
        !researchOutputData?.id ? 'draftCreated' : undefined,
      ),
    );

  const save = () =>
    withSavingAction('publish', () =>
      persist(onSave, behavior.publishesOnSave ? 'published' : undefined),
    );

  const handleSaveDraft = () => handleAction(getDraftModal, saveDraft);
  const handlePublish = () => handleAction(getPublishModal, save);

  const handleInvalid = () => {
    reportFormError(formErrorMessage);
  };

  const handleSubmitConfirmation = async () => {
    if (requestedActionRef.current === 'draft') {
      await handleSaveDraft();
    } else if (requestedActionRef.current === 'publish') {
      await handlePublish();
    }
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    void handleSubmit(handleSubmitConfirmation, handleInvalid)(event);
  };

  return (
    <FormProvider {...methods}>
      <form ref={formRef} onSubmit={handleFormSubmit} noValidate>
        <main css={mainStyles}>
          {modal && (
            <ResearchOutputConfirmModal
              modal={modal}
              onCancel={() => setModal(null)}
              save={(draftSave) => (draftSave ? saveDraft() : save())}
              setAlreadySeenModals={setAlreadySeenModals}
            />
          )}
          <div css={contentStyles} data-flow-id={flowId}>
            <ResearchOutputFormSharingCard
              isSaving={isSaving}
              getImpactSuggestions={getImpactSuggestions}
              getCategorySuggestions={getCategorySuggestions}
              getShortDescriptionFromDescription={
                getShortDescriptionFromDescription
              }
              researchTags={filteredResearchTags}
              typeOptions={typeOptions}
              urlRequired={urlRequired}
              {...availableActions}
            />
            <ResearchOutputPublishingCard {...availableActions} />
            <ResearchOutputExtraInformationCard
              isSaving={isSaving}
              documentType={documentType}
              researchTags={filteredResearchTags}
              tagSuggestions={tagSuggestions.map((suggestion) => ({
                label: suggestion,
                value: suggestion,
              }))}
              {...availableActions}
            />
            <ResearchOutputContributorsCard
              isSaving={isSaving}
              getLabSuggestions={getLabSuggestions}
              getAuthorSuggestions={getAuthorSuggestions}
              getTeamSuggestions={getTeamSuggestions}
              isEditMode={!!researchOutputData}
              authorsRequired={authorsRequired}
              showTeamsAndLabs={availableActions.showTeamsAndLabs}
              authorRestriction={authorRestriction}
              validateContributorTeams={validateContributorTeams}
            />
            <Controller
              name="relatedResearch"
              control={control}
              render={({ field: { value, onChange } }) => (
                <ResearchOutputRelatedResearchCard<
                  EventResponse['relatedResearch']
                >
                  isSaving={isSaving}
                  relatedResearch={value}
                  onChangeRelatedResearch={onChange}
                  getRelatedResearchSuggestions={getRelatedResearchSuggestions}
                  getIconForDocumentType={getIconForDocumentType}
                  isEditMode={!!researchOutputData}
                />
              )}
            />
            <Controller
              name="relatedEvents"
              control={control}
              render={({ field: { value, onChange } }) => (
                <ResearchOutputRelatedEventsCard
                  getRelatedEventSuggestions={getRelatedEventSuggestions}
                  isSaving={isSaving}
                  relatedEvents={value}
                  onChangeRelatedEvents={onChange}
                  isEditMode={!!researchOutputData}
                />
              )}
            />
            <ResearchOutputFormActions
              isSaving={isSaving}
              savingAction={savingAction}
              published={published}
              showSaveDraftButton={showSaveDraftButton}
              showPublishButton={showPublishButton}
              onCancel={handleCancel}
              onSaveDraft={() => requestAction('draft')}
              onPublish={() => requestAction('publish')}
            />
          </div>
        </main>
      </form>
    </FormProvider>
  );
};

export default ResearchOutputForm;
