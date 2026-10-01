import { ResearchOutputResponse } from '@asap-hub/model';
import {
  getVisibleResearchOutputActions,
  ResearchOutputPermissionsContext,
} from '@asap-hub/react-context';
import { network, projectRouteByType, sharedResearch } from '@asap-hub/routing';
import { getResearchOutputEntityType } from '@asap-hub/validation';
import { css } from '@emotion/react';
import React, { ComponentProps, useContext, useState } from 'react';
import { useNavigate } from 'react-router';

import { Card, Headline2, Link, Markdown } from '../atoms';
import { createMailTo, mailToSupport, TECH_SUPPORT_EMAIL } from '../mail';
import { CtaCard } from '../molecules';
import {
  ConfirmModal,
  GrantDocumentGrantsCard,
  GrantDocumentHeaderCard,
  GrantDocumentOverviewCard,
  GrantDocumentPdfCard,
  GrantDocumentTagsCard,
  OutputVersions,
  RelatedEventsCard,
  RelatedResearchCard,
  RichText,
  SharedResearchAdditionalInformationCard,
  SharedResearchDetailsTagsCard,
  SharedResearchOutputButtons,
  SharedResearchOutputHeaderCard,
  SharedResearchOutputToasts,
  type ResearchOutputToast,
  type ResearchOutputToastLocationState,
} from '../organisms';
import { rem } from '../pixels';
import {
  getIconForDocumentType as getIconForDocumentTypeCRN,
  getResearchOutputAssociation,
  getResearchOutputAssociationName,
} from '../utils';
import PageConstraints from './PageConstraints';

const cardsStyles = css({
  display: 'grid',
  rowGap: rem(36),
});

const grantCardsStyles = css({
  rowGap: rem(32),
});

type SharedResearchOutputProps = Pick<
  ResearchOutputResponse,
  | 'description'
  | 'descriptionMD'
  | 'shortDescription'
  | 'changelog'
  | 'keywords'
  | 'usageNotes'
  | 'usageNotesMD'
  | 'contactEmails'
  | 'methods'
  | 'organisms'
  | 'environments'
  | 'subtype'
  | 'id'
  | 'relatedResearch'
  | 'published'
  | 'relatedEvents'
  | 'statusChangedBy'
  | 'isInReview'
  | 'versions'
  | 'relatedManuscript'
  | 'relatedManuscriptVersion'
  | 'publishingEntity'
  | 'project'
  | 'grantDocument'
> &
  ComponentProps<typeof SharedResearchOutputHeaderCard> & {
    backHref: string;
  } & ComponentProps<typeof SharedResearchAdditionalInformationCard> & {
    toast?: ResearchOutputToast;
    grantEnded?: boolean;
    projectHasLead?: boolean;
    onRequestReview?: (
      shouldReview: boolean,
    ) => Promise<ResearchOutputResponse | void>;
    onPublish?: () => Promise<ResearchOutputResponse | void>;
    checkForNewVersion: () => Promise<boolean>;
  };

const getDuplicateLink = ({
  id,
  publishingEntity,
  workingGroups,
  teams,
  project,
}: Pick<
  ResearchOutputResponse,
  'id' | 'publishingEntity' | 'workingGroups' | 'teams' | 'project'
>) => {
  switch (getResearchOutputEntityType({ publishingEntity })) {
    case 'working-group': {
      const workingGroupId = workingGroups?.[0]?.id;
      return workingGroupId
        ? network({})
            .workingGroups({})
            .workingGroup({ workingGroupId })
            .duplicateOutput({ id }).$
        : undefined;
    }
    case 'project': {
      const projectRoute = project && projectRouteByType[project.projectType];
      return project?.id && projectRoute
        ? projectRoute(project.id).duplicateOutput({ id }).$
        : undefined;
    }
    case 'team': {
      // Team outputs are duplicated through their linked project's route
      const teamProject = teams[0]?.project;
      const teamProjectRoute =
        teamProject && projectRouteByType[teamProject.projectType];
      return teamProject && teamProjectRoute
        ? teamProjectRoute(teamProject.id).duplicateOutput({ id }).$
        : undefined;
    }
    default:
      return undefined;
  }
};

const SharedResearchOutput: React.FC<SharedResearchOutputProps> = ({
  description = '',
  descriptionMD = '',
  shortDescription,
  changelog,
  backHref,
  usageNotes = '',
  usageNotesMD = '',
  contactEmails,
  id,
  relatedResearch,
  published,
  toast,
  relatedEvents,
  statusChangedBy,
  isInReview,
  onRequestReview,
  versions,
  onPublish,
  relatedManuscript,
  checkForNewVersion,
  projectHasLead = false,
  grantDocument,
  grantEnded = false,
  ...props
}) => {
  const navigate = useNavigate();
  const { relatedManuscriptVersion } = props;

  const permissions = useContext(ResearchOutputPermissionsContext);

  const isGrantDocumentPage = !!grantDocument;
  const isGrantDocument =
    isGrantDocumentPage ||
    ['Grant Document', 'Presentation'].includes(props.documentType);
  const supplementOutputId =
    grantDocument?.grantType === 'original'
      ? grantDocument.supplement?.researchOutputId
      : undefined;
  const supplementGrantHref =
    supplementOutputId &&
    sharedResearch({}).researchOutput({ researchOutputId: supplementOutputId })
      .$;
  const grantOverview = grantDocument?.[grantDocument.grantType]?.description;

  const duplicateLink = getDuplicateLink({ id, ...props });

  const visibleActions = getVisibleResearchOutputActions(permissions, {
    published,
    isInReview,
    hasRelatedManuscript: !!relatedManuscriptVersion,
    isWorkingGroupOutput: !!(props.workingGroups && props.workingGroups[0]?.id),
    isGrantDocument,
    hasDuplicateDestination: !!duplicateLink,
  });

  const tags = [
    ...props.methods,
    ...props.organisms,
    ...props.environments,
    ...(props.subtype ? [props.subtype] : []),
    ...props.keywords,
  ];

  const hasDescription = description || descriptionMD;
  const displayDescription = hasDescription && !isGrantDocument;
  const hasUsageNotes = usageNotes || usageNotesMD;
  const association = getResearchOutputAssociation(props);
  const associationName = getResearchOutputAssociationName(props);
  const isProjectOutput = association === 'project';
  const isTeamBasedProjectOutput =
    isProjectOutput && props.publishingEntity !== 'Project';
  const publisherRoleClause = isTeamBasedProjectOutput
    ? 'the project manager will be able to review and publish this output.'
    : 'the project leads will be able to review and publish this output.';
  const memberGroupLabel =
    association === 'working group'
      ? 'working group'
      : isProjectOutput
        ? 'project'
        : 'team';
  const [reviewToggled, setReviewToggled] = useState(false);
  const [displayReviewModal, setDisplayReviewModal] = useState(false);
  const [
    displayNoNewManuscriptVersionModal,
    setDisplayNoNewManuscriptVersionModal,
  ] = useState(false);
  const [displayPublishModal, setDisplayPublishModal] = useState(false);

  const toggleReview = async (shouldReview: boolean) => {
    if (!onRequestReview) return;

    await onRequestReview(shouldReview);

    setDisplayReviewModal(false);
    setReviewToggled(true);
  };

  const publishOutput = async () => {
    if (!onPublish) return;
    await onPublish();
    setDisplayPublishModal(false);
  };

  const tagsCard = (displayDescription || !!tags.length) && (
    <SharedResearchDetailsTagsCard
      tags={tags}
      displayDescription={!!displayDescription}
      description={description}
      descriptionMD={descriptionMD}
      shortDescription={shortDescription}
      changelog={changelog}
    />
  );
  const versionsCard = versions.length > 0 && (
    <OutputVersions versions={versions} />
  );

  const checkForNewerManuscriptVersion = async () => {
    const hasNewerVersion = await checkForNewVersion();
    if (hasNewerVersion) {
      void navigate(
        sharedResearch({})
          .researchOutput({ researchOutputId: id })
          .versionResearchOutput({}).$,
      );
    } else {
      setDisplayNoNewManuscriptVersionModal(true);
    }
  };

  return (
    <div>
      <SharedResearchOutputToasts
        published={published}
        toast={toast}
        association={association}
        documentType={props.documentType}
        statusChangedBy={statusChangedBy}
        reviewToggled={reviewToggled}
        associationName={associationName}
        isInReview={isInReview}
        projectHasLead={projectHasLead}
        isTeamBasedProject={isTeamBasedProjectOutput}
        supplementGrantHref={supplementGrantHref}
        grantEnded={grantEnded}
      />
      <PageConstraints>
        {!isGrantDocument && (
          <SharedResearchOutputButtons
            id={id}
            displayReviewModal={displayReviewModal}
            setDisplayReviewModal={setDisplayReviewModal}
            checkForNewerManuscriptVersion={checkForNewerManuscriptVersion}
            isInReview={isInReview}
            isProjectOutput={isProjectOutput}
            duplicateLink={duplicateLink}
            displayPublishModal={displayPublishModal}
            setDisplayPublishModal={setDisplayPublishModal}
            hasRelatedManuscript={!!relatedManuscriptVersion}
            actions={visibleActions}
          />
        )}
        {displayReviewModal && (
          <ConfirmModal
            title={`${
              isInReview
                ? 'Switch output to draft?'
                : `Output ready for ${isProjectOutput ? '' : 'PM '}review?`
            }`}
            description={`All ${memberGroupLabel} members listed on this output will be notified and ${
              isInReview
                ? 'will be able to edit this output again.'
                : isProjectOutput
                  ? publisherRoleClause
                  : 'PMs will be able to review and publish this output.'
            }`}
            cancelText="Cancel"
            confirmText={`${
              isInReview
                ? 'Switch to Draft'
                : `Ready for ${isProjectOutput ? 'Review' : 'PM Review'}`
            }`}
            onSave={() => toggleReview(!isInReview)}
            onCancel={() => {
              setDisplayReviewModal(false);
            }}
          />
        )}
        {displayNoNewManuscriptVersionModal && (
          <ConfirmModal
            title="No new manuscript versions available"
            description="To import a manuscript version, please submit a new manuscript version in the Compliance area first. Once submitted, you'll be able to import the new version here."
            cancelText="Cancel"
            confirmText="Go to Compliance Area"
            onSave={() => {
              setDisplayNoNewManuscriptVersionModal(false);
              void navigate(
                network({})
                  .teams({})
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  .team({ teamId: props.teams[0]!.id })
                  .workspace({}).$,
              );
            }}
            onCancel={() => {
              setDisplayNoNewManuscriptVersionModal(false);
            }}
          />
        )}
        {displayPublishModal && (
          <ConfirmModal
            title={'Publish output for the whole hub?'}
            description={
              <>
                {`All ${memberGroupLabel} members listed on this output will be notified and all
                CRN members will be able to access it. If you want to switch to
                draft after the output was published you need to contact`}
                <Link href={mailToSupport()}> {TECH_SUPPORT_EMAIL}</Link>.
              </>
            }
            cancelText="Cancel"
            confirmText="Publish Output"
            onSave={() => publishOutput()}
            successHref={
              sharedResearch({}).researchOutput({ researchOutputId: id }).$
            }
            successState={
              {
                toast: 'published',
              } satisfies ResearchOutputToastLocationState
            }
            onCancel={() => {
              setDisplayPublishModal(false);
            }}
          />
        )}
        <div css={[cardsStyles, isGrantDocumentPage && grantCardsStyles]}>
          {grantDocument ? (
            <GrantDocumentHeaderCard
              title={props.title}
              documentType={props.documentType}
              link={props.link}
              teams={props.teams}
              addedDate={props.addedDate}
              created={props.created}
              lastUpdatedPartial={props.lastUpdatedPartial}
              grantType={grantDocument.grantType}
              project={grantDocument.project}
            />
          ) : (
            <SharedResearchOutputHeaderCard
              {...props}
              published={published}
              isInReview={isInReview}
              isProjectOutput={isProjectOutput}
            />
          )}
          {!isGrantDocumentPage && tagsCard}
          {!isGrantDocument && hasUsageNotes && (
            <Card>
              <div css={{ paddingBottom: rem(12) }}>
                <Headline2 styleAsHeading={4}>Usage Notes</Headline2>
                <Markdown value={usageNotesMD}></Markdown>
                {!usageNotesMD && <RichText poorText text={usageNotes} />}
              </div>
            </Card>
          )}
          {!isGrantDocument && relatedResearch?.length > 0 && (
            <RelatedResearchCard
              description="Find out all shared research outputs that contributed to this one."
              relatedResearch={relatedResearch}
              getIconForDocumentType={getIconForDocumentTypeCRN}
            />
          )}
          {!isGrantDocumentPage && versionsCard}
          {!isGrantDocument && (
            <RelatedEventsCard relatedEvents={relatedEvents} truncateFrom={3} />
          )}
          {!isGrantDocument && (
            <SharedResearchAdditionalInformationCard {...props} />
          )}
          {grantOverview ? (
            <GrantDocumentOverviewCard text={grantOverview} />
          ) : (
            hasDescription &&
            isGrantDocument &&
            (grantDocument ? (
              <GrantDocumentOverviewCard
                description={description}
                descriptionMD={descriptionMD}
              />
            ) : (
              <Card>
                <Markdown value={descriptionMD} toc></Markdown>
                {!descriptionMD && <RichText toc text={description} />}
              </Card>
            ))
          )}
          {grantDocument && (
            <>
              {props.link && <GrantDocumentPdfCard link={props.link} />}
              {grantDocument.supplement && (
                <GrantDocumentGrantsCard
                  grantType={grantDocument.grantType}
                  original={grantDocument.original}
                  supplement={grantDocument.supplement}
                />
              )}
              {!!tags.length && <GrantDocumentTagsCard tags={tags} />}
              {versionsCard}
            </>
          )}
          {!!contactEmails.length && (
            <CtaCard
              href={createMailTo(contactEmails)}
              buttonText="Contact"
              displayCopy
            >
              <strong>Have additional questions?</strong>
              <br /> Members associated with this output are here to help.
            </CtaCard>
          )}
        </div>
      </PageConstraints>
    </div>
  );
};
export default SharedResearchOutput;
