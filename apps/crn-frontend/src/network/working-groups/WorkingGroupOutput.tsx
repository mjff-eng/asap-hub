import { Frame, toServerValidationError } from '@asap-hub/frontend-utils';
import {
  researchOutputDocumentTypeToType,
  ResearchOutputResponse,
  ResearchOutputVersion,
} from '@asap-hub/model';
import {
  NotFoundPage,
  OutputVersions,
  ResearchOutputForm,
  ResearchOutputHeader,
  Toast,
  usePrevious,
} from '@asap-hub/react-components';
import {
  InnerToastContext,
  resolveResearchOutputAvailableActions,
} from '@asap-hub/react-context';
import { network, useRouteParams } from '@asap-hub/routing';
import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { resolveResearchOutputFlowId } from '../../shared-research/util';
import { useResearchOutputPermissions } from '../../shared-research/state';
import {
  paramOutputDocumentTypeToResearchOutputDocumentType,
  useAuthorSuggestions,
  useGeneratedContent,
  useImpactSuggestions,
  useCategorySuggestions,
  useLabSuggestions,
  usePostResearchOutput,
  usePutResearchOutput,
  useRelatedEventsSuggestions,
  useRelatedResearchSuggestions,
  useResearchTags,
  useTeamSuggestions,
} from '../../shared-state';
import { useWorkingGroupById } from './state';

type WorkingGroupOutputProps = {
  workingGroupId: string;
  researchOutputData?: ResearchOutputResponse;
  versionAction?: 'create' | 'edit';
  isDuplicate?: boolean;
};
const WorkingGroupOutput: React.FC<WorkingGroupOutputProps> = ({
  workingGroupId,
  researchOutputData,
  versionAction,
  isDuplicate = false,
}) => {
  const route = network({})
    .workingGroups({})
    .workingGroup({ workingGroupId }).createOutput;
  const { outputDocumentType } = useRouteParams(route);

  const documentType =
    researchOutputData?.documentType ||
    paramOutputDocumentTypeToResearchOutputDocumentType(outputDocumentType);

  const workingGroup = useWorkingGroupById(workingGroupId);

  const [toastNode, setToastNode] = useState<ReactNode>(undefined);
  const toast = useCallback((node: ReactNode) => setToastNode(node), []);
  const previousToast = usePrevious(toastNode);

  useEffect(() => {
    if (toastNode !== previousToast) {
      window.scrollTo(0, 0);
    }
  }, [toastNode, previousToast]);

  const createResearchOutput = usePostResearchOutput();
  const updateResearchOutput = usePutResearchOutput();
  const updateAndPublishResearchOutput = usePutResearchOutput(true);

  const getImpactSuggestions = useImpactSuggestions();
  const getCategorySuggestions = useCategorySuggestions();
  const getLabSuggestions = useLabSuggestions();
  const getAuthorSuggestions = useAuthorSuggestions();
  const getTeamSuggestions = useTeamSuggestions();
  const getRelatedResearchSuggestions = useRelatedResearchSuggestions(
    researchOutputData?.id,
  );
  const getRelatedEventSuggestions = useRelatedEventsSuggestions();
  const getShortDescriptionFromDescription = useGeneratedContent();
  const researchTags = useResearchTags();

  const published = researchOutputData ? !!researchOutputData.published : false;

  const permissions = useResearchOutputPermissions(
    'workingGroups',
    [workingGroupId],
    published,
  );

  const flowId = resolveResearchOutputFlowId({
    entityType: 'working-group',
    versionAction,
    published,
    hasResearchOutputId: !!researchOutputData?.id,
    isDuplicate,
  });

  const researchSuggestions = researchTags
    .filter((tag) => tag.category === 'Keyword')
    .map((keyword) => keyword.name);

  let versions: ResearchOutputVersion[] = [];
  if (versionAction === 'create') {
    const researchOutputAsVersion: ResearchOutputVersion = {
      id: researchOutputData?.id ?? '',
      title: researchOutputData?.title ?? '',
      documentType: researchOutputData?.documentType ?? 'Article',
      type: researchOutputData?.type,
      link: researchOutputData?.link,
      addedDate: researchOutputData?.addedDate,
    };

    versions = researchOutputData?.versions
      ? researchOutputData.versions.concat([researchOutputAsVersion])
      : [researchOutputAsVersion];
  } else if (versionAction === 'edit') {
    versions = researchOutputData?.versions ?? [];
  }

  const availableActions = resolveResearchOutputAvailableActions({
    flowId,
    permissions,
    documentType,
    researchOutputData,
    versions,
  });

  if (workingGroup) {
    return (
      <Frame title="Share Working Group Research Output">
        {versionAction === 'create' && (
          <Toast accent="warning">
            The previous output page will be replaced with a summarised version
            history section.
          </Toast>
        )}
        <InnerToastContext.Provider value={toast}>
          {toastNode && <Toast accent="error">{toastNode}</Toast>}
          <ResearchOutputHeader
            documentType={documentType}
            entityType="working-group"
            breadcrumbs={[
              {
                label: 'Working Groups',
                href: network({}).workingGroups({}).$,
              },
              {
                label: workingGroup.title,
                href: network({})
                  .workingGroups({})
                  .workingGroup({ workingGroupId })
                  .about({}).$,
              },
            ]}
          />
          {availableActions.showChangelogAndVersionHistory && (
            <OutputVersions
              app="crn"
              versions={versions}
              versionAction={versionAction}
            />
          )}
          <ResearchOutputForm
            versionAction={versionAction}
            tagSuggestions={researchSuggestions}
            documentType={documentType}
            getImpactSuggestions={getImpactSuggestions}
            getCategorySuggestions={getCategorySuggestions}
            getLabSuggestions={getLabSuggestions}
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
            getShortDescriptionFromDescription={
              getShortDescriptionFromDescription
            }
            getRelatedEventSuggestions={getRelatedEventSuggestions}
            researchTags={researchTags}
            researchOutputData={researchOutputData}
            typeOptions={Array.from(
              researchOutputDocumentTypeToType[documentType],
            )}
            selectedTeams={(researchOutputData?.teams ?? []).map(
              ({ displayName, id }) => ({
                label: displayName,
                value: id,
              }),
            )}
            authorsRequired
            published={published}
            permissions={permissions}
            onSave={(output) =>
              researchOutputData?.id
                ? updateAndPublishResearchOutput(researchOutputData.id, {
                    ...output,
                    workingGroups: [workingGroupId],
                    published: true,
                    createVersion: versionAction === 'create',
                    statusChangedById: researchOutputData.statusChangedBy?.id,
                    isInReview: researchOutputData.isInReview,
                  }).catch(toServerValidationError(['/link', '/title']))
                : createResearchOutput({
                    ...output,
                    workingGroups: [workingGroupId],
                    published: true,
                  }).catch(toServerValidationError(['/link', '/title']))
            }
            onSaveDraft={(output) =>
              researchOutputData?.id
                ? updateResearchOutput(researchOutputData.id, {
                    ...output,
                    workingGroups: [workingGroupId],
                    published: false,
                    statusChangedById: researchOutputData.statusChangedBy?.id,
                    isInReview: researchOutputData.isInReview,
                  }).catch(toServerValidationError(['/link', '/title']))
                : createResearchOutput({
                    ...output,
                    workingGroups: [workingGroupId],
                    published: false,
                  }).catch(toServerValidationError(['/link', '/title']))
            }
            flowId={flowId}
            availableActions={availableActions}
          />
        </InnerToastContext.Provider>
      </Frame>
    );
  }
  return <NotFoundPage />;
};

export default WorkingGroupOutput;
