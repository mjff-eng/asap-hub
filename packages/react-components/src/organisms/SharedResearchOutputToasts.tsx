import React, { useEffect, useState } from 'react';
import { ResearchOutputResponse } from '@asap-hub/model';
import { css } from '@emotion/react';
import Toast from './Toast';
import { Anchor } from '../atoms';
import { rem } from '../pixels';

export type ResearchOutputToast = 'published' | 'draftCreated';

export type ResearchOutputToastLocationState = {
  toast?: ResearchOutputToast;
};

export interface SharedResearchOutputToastsProps {
  association: string;
  documentType: string;
  published: boolean;
  statusChangedBy: ResearchOutputResponse['statusChangedBy'];
  toast?: ResearchOutputToast;
  reviewToggled: boolean;
  associationName: string;
  isInReview: boolean;
  projectHasLead?: boolean;
  isTeamBasedProject?: boolean;
  supplementGrantHref?: string;
  grantEnded?: boolean;
}

const capitalizeAssociation = (association: string): string => {
  switch (association) {
    case 'working group':
      return 'Working Group';
    case 'project':
      return 'Project';
    default:
      return 'Team';
  }
};

const underlineStyles = css({ textDecoration: 'underline' });

const toastContainer = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(4),
});

const SharedResearchOutputToasts: React.FC<SharedResearchOutputToastsProps> = ({
  association,
  documentType,
  published,
  toast,
  statusChangedBy,
  reviewToggled,
  associationName,
  isInReview,
  projectHasLead = false,
  isTeamBasedProject = false,
  supplementGrantHref,
  grantEnded = false,
}) => {
  const isProject = association === 'project';
  const [flashToast, setFlashToast] = useState(toast);
  const [showSupplementGrantToast, setShowSupplementGrantToast] =
    useState(true);
  const [showGrantEndedToast, setShowGrantEndedToast] = useState(true);
  const [reviewToastState, setReviewToastState] = useState(
    reviewToggled ? (isInReview ? 'requested' : 'dismissed') : null,
  );

  useEffect(() => {
    setReviewToastState(
      reviewToggled ? (isInReview ? 'requested' : 'dismissed') : null,
    );
    setFlashToast(toast);
  }, [reviewToggled, isInReview, toast]);

  return (
    <div css={toastContainer}>
      {flashToast === 'draftCreated' && (
        <Toast accent="successLarge" onClose={() => setFlashToast(undefined)}>
          {`Draft ${capitalizeAssociation(
            association,
          )} ${documentType} created successfully.`}
        </Toast>
      )}
      {reviewToastState === 'requested' && (
        <Toast accent="successLarge" onClose={() => setReviewToastState(null)}>
          {`Draft ${association} ${documentType} submitted for ${
            isProject ? 'review' : 'PM review'
          } successfully.`}
        </Toast>
      )}
      {reviewToastState === 'dismissed' && (
        <Toast accent="successLarge" onClose={() => setReviewToastState(null)}>
          {`In review ${association} ${documentType} switched to draft successfully.`}
        </Toast>
      )}
      {!published && isInReview && statusChangedBy && (
        <Toast accent="info">
          {`${statusChangedBy.firstName} ${
            statusChangedBy.lastName
          } on ${associationName} requested ${
            isProject
              ? isTeamBasedProject
                ? 'the project manager'
                : 'the project leads'
              : 'PMs'
          } to review this output. This draft is only available to members in the ${association} listed below.`}
        </Toast>
      )}
      {flashToast === 'published' && (
        <Toast accent="successLarge" onClose={() => setFlashToast(undefined)}>
          {`${capitalizeAssociation(
            association,
          )} ${documentType} published successfully.`}
        </Toast>
      )}
      {!published && !isInReview && (
        <Toast accent="warning">{`This draft is available to members in the ${association}
                listed below. ${
                  isProject
                    ? projectHasLead
                      ? isTeamBasedProject
                        ? 'Only the project manager can publish this output.'
                        : 'Only project leads can publish this output.'
                      : 'Any project member can publish this output.'
                    : 'Only PMs can publish this output.'
                }`}</Toast>
      )}
      {supplementGrantHref && showSupplementGrantToast && (
        <Toast
          accent="warning"
          onClose={() => setShowSupplementGrantToast(false)}
        >
          This is an original grant proposal. A{' '}
          <span css={underlineStyles}>
            <Anchor href={supplementGrantHref}>supplement version</Anchor>
          </span>{' '}
          is now available.
        </Toast>
      )}
      {grantEnded && showGrantEndedToast && (
        <Toast accent="warning" onClose={() => setShowGrantEndedToast(false)}>
          The funding period for this grant has closed.
        </Toast>
      )}
    </div>
  );
};

export default SharedResearchOutputToasts;
