import {
  DiscussionCreateRequest,
  ManuscriptDiscussion,
  ManuscriptFileResponse,
} from '@asap-hub/model';
import { css } from '@emotion/react';
import { ComponentProps, useState } from 'react';

import { DiscussionModal, DiscussionCard } from '.';
import { Button } from '../atoms';
import { colour } from '../colors';
import { replyIcon } from '../icons';
import { InformationSection } from '../molecules';
import { rem } from '../pixels';

const headerContainerStyles = css({
  padding: `${rem(24)} ${rem(16)}`,
});

const startButtonTextStyles = css({
  display: 'flex',
  gap: rem(8),
  margin: `0 ${rem(8)} 0 0`,
  path: {
    stroke: '#FFFFFF',
  },
});

const showMoreButtonStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  fontWeight: 'normal',
  color: colour.foreground.brand,
  paddingTop: rem(24),
  paddingBottom: rem(24),

  textDecoration: 'none',

  ':hover': {
    textDecoration: 'none',
  },
});

const showMoreButtonTextStyles = css({
  height: rem(24),
  display: 'flex',
  alignItems: 'center',
  gap: rem(4),
});

const arrowIconStyles = css({
  alignSelf: 'start',
});

type DiscussionsTabProps = Pick<
  ComponentProps<typeof DiscussionCard>,
  'onReplyToDiscussion' | 'onMarkDiscussionAsRead' | 'showTeamName'
> & {
  manuscriptId: string;
  createDiscussion: (
    manuscriptId: string,
    title: string,
    message: string,
    files?: ManuscriptFileResponse[],
  ) => Promise<string | undefined>;
  handleFileUpload: ComponentProps<typeof DiscussionModal>['handleFileUpload'];
  discussions: ManuscriptDiscussion[];
  canParticipateInDiscussion: boolean;
  isActiveManuscript: boolean;
};

const DiscussionsTab: React.FC<DiscussionsTabProps> = ({
  createDiscussion,
  handleFileUpload,
  manuscriptId,
  discussions,
  onReplyToDiscussion,
  canParticipateInDiscussion,
  isActiveManuscript,
  onMarkDiscussionAsRead,
  showTeamName,
}) => {
  const [displayDiscussionModal, setDisplayDiscussionModal] = useState(false);
  const [showAllDiscussions, setShowAllDiscussions] = useState(false);

  const handleSave = async (data: DiscussionCreateRequest) => {
    if (!data.title) return;
    await createDiscussion(manuscriptId, data.title, data.text, data.files);
  };

  const displayedDiscussions = showAllDiscussions
    ? discussions
    : discussions.slice(0, 5);

  const showMoreIsVisible = discussions.length > 5 && !showAllDiscussions;

  const DiscussionHeader = () => {
    if (!canParticipateInDiscussion) {
      return (
        <InformationSection>
          Only authorized users can participate in Discussions.
        </InformationSection>
      );
    }

    if (!isActiveManuscript) {
      return (
        <InformationSection>
          Discussions for this manuscript have ended as it is either compliant
          or closed.
        </InformationSection>
      );
    }

    return (
      <div>
        {canParticipateInDiscussion && isActiveManuscript && (
          <Button
            primary
            small
            noMargin
            onClick={() => setDisplayDiscussionModal(true)}
          >
            <span css={startButtonTextStyles}>{replyIcon}Start Discussion</span>
          </Button>
        )}
      </div>
    );
  };

  return (
    <div>
      <div css={headerContainerStyles}>
        <DiscussionHeader />
      </div>
      {displayedDiscussions.map((discussion, index) => (
        <DiscussionCard
          manuscriptId={manuscriptId}
          key={discussion.id}
          discussion={discussion}
          handleFileUpload={handleFileUpload}
          onReplyToDiscussion={onReplyToDiscussion}
          onMarkDiscussionAsRead={onMarkDiscussionAsRead}
          isLast={index === displayedDiscussions.length - 1}
          displayReplyButton={canParticipateInDiscussion && isActiveManuscript}
          showTeamName={showTeamName}
        />
      ))}
      {showMoreIsVisible && (
        <Button
          linkStyle
          onClick={() => setShowAllDiscussions(true)}
          overrideStyles={showMoreButtonStyles}
        >
          <span css={showMoreButtonTextStyles}>
            Show more
            <span css={arrowIconStyles}>{'↓'}</span>
          </span>
        </Button>
      )}
      {displayDiscussionModal && (
        <DiscussionModal
          type="start"
          onDismiss={() => setDisplayDiscussionModal(false)}
          onSave={handleSave}
          handleFileUpload={handleFileUpload}
        />
      )}
    </div>
  );
};

export default DiscussionsTab;
