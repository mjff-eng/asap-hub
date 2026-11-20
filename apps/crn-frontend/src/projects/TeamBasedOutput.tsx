import { toServerValidationError } from '@asap-hub/frontend-utils';
import {
  ManuscriptVersionResponse,
  ProjectDetail,
  researchOutputDocumentTypeToType,
  ResearchOutputResponse,
  ResearchOutputVersion,
} from '@asap-hub/model';
import {
  Loading,
  ManuscriptVersionImportCard,
  NotFoundPage,
  OutputVersions,
  ResearchOutputForm,
  Toast,
  utils,
} from '@asap-hub/react-components';
import { resolveResearchOutputAvailableActions } from '@asap-hub/react-context';
import {
  network,
  OutputDocumentTypeParameter,
  useRouteParams,
} from '@asap-hub/routing';
import React, { useMemo, useState } from 'react';

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
  useResearchOutputPermissions,
  useTeamOutputPermissions,
} from '../shared-research/state';
import {
  paramOutputDocumentTypeToResearchOutputDocumentType,
  useAuthorSuggestions,
  useCategorySuggestions,
  useGeneratedContent,
  useImpactSuggestions,
  useLabSuggestions,
  usePostResearchOutput,
  usePutResearchOutput,
  useRelatedEventsSuggestions,
  useRelatedResearchSuggestions,
  useResearchTags,
  useTeamSuggestions,
} from '../shared-state';
import { useTeamById } from '../network/teams/state';

const useParamOutputDocumentType = (
  teamId: string,
): OutputDocumentTypeParameter => {
  const route = network({}).teams({}).team({ teamId }).createOutput;
  const { outputDocumentType } = useRouteParams(route);
  return outputDocumentType;
};

type TeamBasedOutputProps = {
  teamId: string;
  researchOutputData?: ResearchOutputResponse;
  latestManuscriptVersion?: ManuscriptVersionResponse;
  versionAction?: 'create' | 'edit';
  isDuplicate?: boolean;
  project?: Pick<ProjectDetail, 'id' | 'title' | 'projectType'>;
};

const TeamBasedOutput: React.FC<TeamBasedOutputProps> = ({
  teamId,
  researchOutputData: existingOutput,
  latestManuscriptVersion,
  versionAction: versionActionProp,
  isDuplicate = false,
  project,
}) => {
  const paramOutputDocumentType = useParamOutputDocumentType(teamId);
  const documentType =
    existingOutput?.documentType ||
    paramOutputDocumentTypeToResearchOutputDocumentType(
      paramOutputDocumentType,
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
        publishingEntity: 'Team',
      }),
    [
      existingOutput,
      manuscriptImport,
      latestManuscriptVersion,
      versionActionProp,
    ],
  );

  const team = useTeamById(teamId);
  const createResearchOutput = usePostResearchOutput();
  const updateResearchOutput = usePutResearchOutput();
  const updateAndPublishResearchOutput = usePutResearchOutput(true);
  const getImpactSuggestions = useImpactSuggestions();
  const getCategorySuggestions = useCategorySuggestions();
  const getLabSuggestions = useLabSuggestions();
  const getAuthorSuggestions = useAuthorSuggestions();
  const getTeamSuggestions = useTeamSuggestions();
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

  const teamProject = (researchOutput ?? existingOutput)?.teams?.[0]?.project;
  const isTeamBasedProjectOutput = !!teamProject;

  const isProjectOutput = !!project || isTeamBasedProjectOutput;

  const breadcrumbProject = teamProject ?? project;
  const breadcrumbs = breadcrumbProject
    ? utils.getProjectBreadcrumbs(breadcrumbProject, breadcrumbProject.id)
    : [];

  const authorsRequired = isProjectOutput && documentType === 'Article';

  const basePermissions = useResearchOutputPermissions(
    'teams',
    researchOutput?.teams.map(({ id }) => id) ?? [teamId],
    published,
    isImportedFromManuscript,
  );
  const permissions = useTeamOutputPermissions(basePermissions, team?.members);
  const flowId = resolveResearchOutputFlowId({
    entityType: 'team',
    versionAction,
    published,
    isImportedFromManuscript,
    isDuplicate,
    // When importing an already-published manuscript whose preprint was
    // never shared as an output, the backend auto-creates the preprint
    // output and researchOutput gains its id at runtime, turning this
    // import into an add-version flow.
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

  if (!team) {
    return <NotFoundPage />;
  }

  if (isNewManuscriptVersion && !latestManuscriptVersion) {
    return <Loading />;
  }

  if (showManuscriptOutputFlow) {
    return (
      <OutputPageShell
        documentType={documentType}
        entityType="team"
        isProjectOutput={isProjectOutput}
        breadcrumbs={breadcrumbs}
      >
        <ManuscriptOutputSelectionScreen
          teamId={teamId}
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
      entityType="team"
      documentType={documentType}
      isProjectOutput={isProjectOutput}
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
        getLabSuggestions={getLabSuggestions}
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
        getTeamSuggestions={getTeamSuggestions}
        getRelatedResearchSuggestions={getRelatedResearchSuggestions}
        getRelatedEventSuggestions={getRelatedEventSuggestions}
        researchTags={researchTags}
        researchOutputData={researchOutput}
        typeOptions={Array.from(researchOutputDocumentTypeToType[documentType])}
        urlRequired={documentType !== 'Lab Material'}
        selectedTeams={(researchOutput?.teams ?? [team]).map(
          (selectedTeam, index) => ({
            label: selectedTeam.displayName,
            value: selectedTeam.id,
            isFixed: index === 0,
          }),
        )}
        authorsRequired={authorsRequired}
        validateContributorTeams={authorsRequired}
        published={published}
        permissions={permissions}
        isImportedFromManuscript={isImportedFromManuscript}
        onSave={(output) =>
          researchOutput?.id
            ? updateAndPublishResearchOutput(researchOutput.id, {
                ...output,
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
                published: false,
                statusChangedById: researchOutput.statusChangedBy?.id,
                isInReview: researchOutput.isInReview,
              }).catch(toServerValidationError(['/link', '/title']))
            : createResearchOutput({
                ...output,
                published: false,
              }).catch(toServerValidationError(['/link', '/title']))
        }
        flowId={flowId}
        availableActions={availableActions}
      />
    </OutputPageShell>
  );
};

export default TeamBasedOutput;
