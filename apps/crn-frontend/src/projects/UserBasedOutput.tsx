import { toServerValidationError } from '@asap-hub/frontend-utils';
import {
  ManuscriptVersionResponse,
  researchOutputDocumentTypeToType,
  ResearchOutputResponse,
  ResearchOutputVersion,
} from '@asap-hub/model';
import {
  Loading,
  ManuscriptVersionImportCard,
  OutputVersions,
  ResearchOutputForm,
  Toast,
  utils,
} from '@asap-hub/react-components';
import { resolveResearchOutputAvailableActions } from '@asap-hub/react-context';
import { OutputDocumentTypeParameter } from '@asap-hub/routing';
import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router';

import OutputPageShell from '../shared-research/OutputPageShell';
import ManuscriptOutputSelectionScreen from '../shared-research/ManuscriptOutputSelectionScreen';
import {
  isAddingVersionOfManuscriptOutput,
  ManuscriptImport,
  resolveManuscriptOutputState,
} from '../shared-research/manuscript-import';
import {
  resolveResearchOutputFlowId,
  toResearchOutputVersion,
} from '../shared-research/util';
import {
  useProjectOutputPermissions,
  useResearchOutputPermissions,
} from '../shared-research/state';
import { useProjectById } from './state';
import {
  paramOutputDocumentTypeToResearchOutputDocumentType,
  useAuthorSuggestions,
  useCategorySuggestions,
  useGeneratedContent,
  useImpactSuggestions,
  usePostResearchOutput,
  usePutResearchOutput,
  useRelatedEventsSuggestions,
  useRelatedResearchSuggestions,
  useResearchTags,
} from '../shared-state';

type UserBasedOutputProps = {
  projectId: string;
  researchOutputData?: ResearchOutputResponse;
  latestManuscriptVersion?: ManuscriptVersionResponse;
  versionAction?: 'create' | 'edit';
  isDuplicate?: boolean;
};

const UserBasedOutput: React.FC<UserBasedOutputProps> = ({
  projectId,
  researchOutputData: existingOutput,
  latestManuscriptVersion,
  versionAction: versionActionProp,
  isDuplicate = false,
}) => {
  const { outputDocumentType } = useParams<{
    outputDocumentType: OutputDocumentTypeParameter;
  }>();
  const documentType =
    existingOutput?.documentType ||
    paramOutputDocumentTypeToResearchOutputDocumentType(
      outputDocumentType as OutputDocumentTypeParameter,
    );

  const [manuscriptImport, setManuscriptImport] = useState<ManuscriptImport>();

  const isNewManuscriptVersion = isAddingVersionOfManuscriptOutput({
    versionAction: versionActionProp,
    existingOutput,
  });

  const [showManuscriptOutputFlow, setShowManuscriptOutputFlow] = useState(
    () =>
      !isNewManuscriptVersion &&
      !isDuplicate &&
      documentType === 'Article' &&
      !existingOutput?.id,
  );

  const {
    researchOutput,
    importedVersion,
    isImportedFromManuscript,
    versionAction,
  } = useMemo(
    () =>
      resolveManuscriptOutputState({
        existingOutput,
        manuscriptImport,
        latestManuscriptVersion,
        versionAction: versionActionProp,
        publishingEntity: 'Project',
      }),
    [
      existingOutput,
      manuscriptImport,
      latestManuscriptVersion,
      versionActionProp,
    ],
  );

  const project = useProjectById(projectId);
  const projectMemberIds = useMemo(
    () =>
      project && 'members' in project
        ? project.members?.map(({ id }) => id)
        : undefined,
    [project],
  );

  const createResearchOutput = usePostResearchOutput();
  const updateResearchOutput = usePutResearchOutput();
  const updateAndPublishResearchOutput = usePutResearchOutput(true);
  const getImpactSuggestions = useImpactSuggestions();
  const getCategorySuggestions = useCategorySuggestions();
  const getAuthorSuggestions = useAuthorSuggestions();
  const getRelatedResearchSuggestions = useRelatedResearchSuggestions(
    researchOutput?.id,
  );
  const getRelatedEventSuggestions = useRelatedEventsSuggestions();
  const researchTags = useResearchTags();
  const getShortDescriptionFromDescription = useGeneratedContent();
  const researchSuggestions = researchTags
    .filter((tag) => tag.category === 'Keyword')
    .map((keyword) => keyword.name);

  const published = !!researchOutput?.published;

  const basePermissions = useResearchOutputPermissions(
    'projects',
    [projectId],
    published,
    isImportedFromManuscript,
  );

  const permissions = useProjectOutputPermissions(basePermissions, project);

  const flowId = resolveResearchOutputFlowId({
    entityType: 'project',
    versionAction,
    published,
    isImportedFromManuscript,
    isDuplicate,
    hasResearchOutputId: !!(researchOutput?.id || existingOutput?.id),
  });

  let versions: ResearchOutputVersion[];
  if (versionAction === 'edit') {
    versions = researchOutput?.versions ?? [];
  } else if (isNewManuscriptVersion) {
    versions = [
      ...(existingOutput?.versions ?? []),
      toResearchOutputVersion(existingOutput),
    ];
  } else {
    versions = [
      ...(researchOutput?.versions ?? []),
      toResearchOutputVersion(researchOutput),
    ];
  }

  const availableActions = resolveResearchOutputAvailableActions({
    flowId,
    permissions,
    documentType,
    researchOutputData: researchOutput,
    versions,
  });

  if (isNewManuscriptVersion && !latestManuscriptVersion) {
    return <Loading />;
  }

  const breadcrumbs = utils.getProjectBreadcrumbs(project, projectId);

  if (showManuscriptOutputFlow) {
    return (
      <OutputPageShell
        documentType={documentType}
        entityType="project"
        breadcrumbs={breadcrumbs}
      >
        <ManuscriptOutputSelectionScreen
          projectId={projectId}
          onCreateManually={() => setShowManuscriptOutputFlow(false)}
          onManuscriptImported={(imported) => {
            setManuscriptImport(imported);
            setShowManuscriptOutputFlow(false);
          }}
        />
      </OutputPageShell>
    );
  }

  return (
    <OutputPageShell
      documentType={documentType}
      entityType="project"
      breadcrumbs={breadcrumbs}
      banner={
        versionAction === 'create' &&
        !!researchOutput?.id && (
          <Toast accent="warning">
            The previous output page will be replaced with a summarised version
            history section.
          </Toast>
        )
      }
    >
      {availableActions.showChangelogAndVersionHistory && (
        <OutputVersions
          app="crn"
          versions={versions}
          versionAction={versionAction}
        />
      )}
      {importedVersion && (
        <ManuscriptVersionImportCard version={importedVersion} />
      )}
      <ResearchOutputForm
        versionAction={versionAction}
        tagSuggestions={researchSuggestions}
        documentType={documentType}
        getImpactSuggestions={getImpactSuggestions}
        getCategorySuggestions={getCategorySuggestions}
        getShortDescriptionFromDescription={getShortDescriptionFromDescription}
        getAuthorSuggestions={(input) =>
          getAuthorSuggestions(input).then((authors) =>
            authors.map((author) => ({
              author,
              label: author.displayName,
              value: author.id,
            })),
          )
        }
        projectMemberIds={projectMemberIds}
        getRelatedResearchSuggestions={getRelatedResearchSuggestions}
        getRelatedEventSuggestions={getRelatedEventSuggestions}
        researchTags={researchTags}
        researchOutputData={researchOutput}
        typeOptions={Array.from(researchOutputDocumentTypeToType[documentType])}
        urlRequired={documentType !== 'Lab Material'}
        selectedTeams={[]}
        authorsRequired
        published={published}
        permissions={permissions}
        isImportedFromManuscript={isImportedFromManuscript}
        onSave={(output) =>
          researchOutput?.id
            ? updateAndPublishResearchOutput(researchOutput.id, {
                ...output,
                projectId,
                teams: [],
                published: true,
                createVersion: versionAction === 'create',
                relatedManuscriptVersion:
                  versionAction === 'create'
                    ? importedVersion?.versionId
                    : researchOutput.relatedManuscriptVersion,
                statusChangedById: researchOutput.statusChangedBy?.id,
                isInReview: researchOutput.isInReview,
              }).catch(toServerValidationError(['/link', '/title']))
            : createResearchOutput({
                ...output,
                projectId,
                teams: [],
                published: true,
                relatedManuscriptVersion:
                  researchOutput?.relatedManuscriptVersion,
                relatedManuscript: researchOutput?.relatedManuscript,
              }).catch(toServerValidationError(['/link', '/title']))
        }
        onSaveDraft={(output) =>
          researchOutput?.id
            ? updateResearchOutput(researchOutput.id, {
                ...output,
                projectId,
                teams: [],
                published: false,
                statusChangedById: researchOutput.statusChangedBy?.id,
                isInReview: researchOutput.isInReview,
              }).catch(toServerValidationError(['/link', '/title']))
            : createResearchOutput({
                ...output,
                projectId,
                teams: [],
                published: false,
              }).catch(toServerValidationError(['/link', '/title']))
        }
        flowId={flowId}
        availableActions={availableActions}
      />
    </OutputPageShell>
  );
};

export default UserBasedOutput;
