import { DiscussionRequest, ManuscriptDiscussion } from '@asap-hub/model';
import { css } from '@emotion/react';
import { ComponentProps, useState } from 'react';

import {
  colour,
  DiscussionModal,
  ExpandableText,
  formatDate,
  UserAvatarList,
} from '..';
import { Anchor, Avatar, Button, Subtitle, TextEditor } from '../atoms';
import { minusRectIcon, plusRectIcon, replyIcon } from '../icons';
import DiscussionAttachedFiles from '../molecules/DiscussionAttachedFiles';
import UserComment from '../molecules/UserComment';
import UserTeamInfo from '../molecules/UserTeamInfo';
import { mobileScreen, rem } from '../pixels';
import { getTeams, getUserHref } from '../utils';

const containerStyles = (isLast: boolean, unread: boolean) =>
  css({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colour.background.primary,
    gap: rem(20),
    padding: `${rem(24)} ${rem(15)}`,

    borderLeft: `8px solid ${unread ? colour.border.info : 'transparent'}`,

    borderTop: `1px solid ${colour.border.tertiary}`,
    borderBottom: isLast ? `1px solid ${colour.border.tertiary}` : 0,

    [`@media (max-width: ${mobileScreen.max}px)`]: {
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
  });

const avatarStyles = css({
  margin: 'auto',
  width: rem(24),
  height: rem(24),
});

const replyContainerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  marginTop: rem(24),
  marginLeft: rem(32),
});

const collapsedViewContainerStyles = css({
  display: 'flex',
  flexDirection: 'column',
});

const replyAvatarsStyles = css({
  display: 'flex',
  alignItems: 'center',
  div: {
    padding: 0,
  },
});

const userInfoStyles = css({
  display: 'inline-flex',
  gap: rem(2),
  fontSize: rem(14),
  color: colour.foreground.tertiary,
  fontWeight: 400,
});

const lastUpdateStyles = (unread: boolean) =>
  css({
    display: 'inline-flex',
    gap: rem(8),
    alignItems: 'center',
    marginTop: rem(16),
    fontSize: rem(14),
    fontWeight: unread ? 700 : 400,
    color: colour.foreground.tertiary,
  });

const expandedViewContainerStyles = css({
  display: 'flex',
  flexDirection: 'column',
});

const userHeaderStyles = css({
  marginTop: rem(12),
  marginBottom: rem(8),
  display: 'flex',
  flexWrap: 'nowrap',
  gap: rem(8),
});

const userInfoWrapperStyles = css({
  display: 'flex',
  flexWrap: 'wrap',
  fontSize: rem(14),
  gap: rem(8),
  color: colour.foreground.tertiary,
  fontWeight: 400,
});

const textEditorStyles = css({
  fontSize: rem(17),
  fontWeight: 400,
  lineHeight: rem(24),
  color: colour.foreground.tertiary,
});

const discussionTextStyles = css({
  color: colour.foreground.tertiary,
});

const replyButtonStyles = css({
  display: 'inline-flex',
  justifyContent: 'center',
  alignItems: 'center',
  borderColor: colour.border.tertiary,
  borderWidth: 1,
  borderStyle: 'solid',
  width: 'fit-content',
  '> svg': {
    height: rem(24),
    path: {
      stroke: colour.foreground.primary,
    },
  },
});

const replySingleContainerStyles = css({
  marginTop: rem(24),
});

const replyCountDividerStyles = css({
  display: 'flex',
  alignItems: 'center',
  paddingBottom: rem(32),
});

const replyContainerSeparatorStyles = css({
  paddingTop: rem(32),
  paddingBottom: rem(32),
});

const replyButtonContainerStyles = css({
  marginTop: rem(32),
});

const replyCountStyles = css({
  fontSize: rem(14),
  lineHeight: rem(16),
  fontWeight: 700,
  color: colour.foreground.tertiary,
  marginRight: rem(8),
  flexShrink: 0,
});

const replyLineSeparatorStyles = css({
  flexGrow: 1,
  height: rem(1),
  backgroundColor: colour.neutral[100],
});

const fullWidthStyles = css({
  width: '100%',
});

interface DiscussionCardProps {
  manuscriptId: string;
  discussion: ManuscriptDiscussion;
  onReplyToDiscussion: (
    manuscriptId: string,
    discussionId: string,
    patch: DiscussionRequest,
  ) => Promise<void>;
  onMarkDiscussionAsRead: (
    manuscriptId: string,
    discussionId: string,
  ) => Promise<void>;
  isLast?: boolean;
  displayReplyButton?: boolean;
  showTeamName?: boolean;
  handleFileUpload: ComponentProps<typeof DiscussionModal>['handleFileUpload'];
}

const DiscussionCard: React.FC<DiscussionCardProps> = ({
  manuscriptId,
  discussion,
  onReplyToDiscussion,
  onMarkDiscussionAsRead,
  isLast = false,
  displayReplyButton = false,
  showTeamName,
  handleFileUpload,
}) => {
  const [expanded, setExpanded] = useState(false);

  const handleExpand = async (newExpandedValue: boolean) => {
    setExpanded(newExpandedValue);
    if (newExpandedValue && !discussion.read) {
      await onMarkDiscussionAsRead(manuscriptId, discussion.id);
    }
  };

  return (
    <div css={containerStyles(isLast, !discussion.read)}>
      <Button
        data-testid={`discussion-collapsible-button-${discussion.id}`}
        linkStyle
        onClick={() => handleExpand(!expanded)}
      >
        {expanded ? minusRectIcon : plusRectIcon}
      </Button>
      <span css={fullWidthStyles}>
        {expanded ? (
          <ExpandedView
            manuscriptId={manuscriptId}
            discussion={discussion}
            onReplyToDiscussion={onReplyToDiscussion}
            displayReplyButton={displayReplyButton}
            showTeamName={showTeamName}
            handleFileUpload={handleFileUpload}
          />
        ) : (
          <CollapsedView
            discussion={discussion}
            onExpand={() => setExpanded(true)}
            showTeamName={showTeamName}
          />
        )}
      </span>
    </div>
  );
};

const CollapsedView = ({
  discussion,
  onExpand,
  showTeamName,
}: Pick<DiscussionCardProps, 'discussion' | 'showTeamName'> & {
  onExpand: () => void;
}) => {
  const { replies } = discussion;
  const hasReplies = replies && replies.length > 0;

  return (
    <div css={collapsedViewContainerStyles}>
      <Subtitle noMargin>{discussion.title}</Subtitle>
      <span css={userInfoStyles}>
        Started by:
        <UserTeamInfo
          displayName={discussion.createdBy.displayName}
          userHref={getUserHref(discussion.createdBy.id)}
          teams={getTeams(discussion.createdBy.teams)}
          showTeamName={showTeamName}
        />
      </span>
      <div css={lastUpdateStyles(!discussion.read)}>
        {hasReplies ? (
          <div css={replyAvatarsStyles}>
            <UserAvatarList
              variant="spread"
              members={replies.map((reply) => reply.createdBy)}
              onClick={onExpand}
              small
            />
          </div>
        ) : (
          <span>No replies </span>
        )}
        <span>•</span>
        <span>
          Last Update: {formatDate(new Date(discussion.lastUpdatedAt))}
        </span>
      </div>
    </div>
  );
};

const ExpandedView = ({
  manuscriptId,
  discussion,
  onReplyToDiscussion,
  displayReplyButton,
  showTeamName,
  handleFileUpload,
}: Omit<DiscussionCardProps, 'onMarkDiscussionAsRead'>) => {
  const userHref = getUserHref(discussion.createdBy.id);
  const [displayReplyModal, setDisplayReplyModal] = useState<boolean>(false);
  const { text, replies, files } = discussion;
  const hasReplies = replies && replies.length > 0;

  const replyButton = (
    <Button
      noMargin
      small
      onClick={() => setDisplayReplyModal(true)}
      data-testid={`discussion-reply-button-${discussion.id}`}
      overrideStyles={replyButtonStyles}
    >
      {replyIcon} Reply
    </Button>
  );

  return (
    <>
      {displayReplyModal && (
        <DiscussionModal
          type="reply"
          onDismiss={() => setDisplayReplyModal(false)}
          onSave={(data) =>
            onReplyToDiscussion(manuscriptId, discussion.id, {
              text: data.text,
              files: data.files,
              manuscriptId,
            })
          }
          handleFileUpload={handleFileUpload}
        />
      )}
      <div css={expandedViewContainerStyles}>
        <Subtitle noMargin>{discussion.title}</Subtitle>
        <div css={userHeaderStyles}>
          <Anchor href={userHref}>
            <Avatar
              imageUrl={discussion.createdBy.avatarUrl}
              firstName={discussion.createdBy.firstName}
              lastName={discussion.createdBy.lastName}
              overrideStyles={avatarStyles}
            />
          </Anchor>
          <span css={userInfoWrapperStyles}>
            <UserTeamInfo
              displayName={discussion.createdBy.displayName}
              userHref={userHref}
              teams={getTeams(discussion.createdBy.teams)}
              showTeamName={showTeamName}
            />
            <span>•</span>
            <span>{formatDate(new Date(discussion.createdDate))}</span>
          </span>
        </div>
        <span css={discussionTextStyles}>
          <ExpandableText variant="arrow">
            <TextEditor
              value={text}
              enabled={false}
              isMarkdown
              editorStyles={textEditorStyles}
            />
          </ExpandableText>
        </span>

        {files?.length ? <DiscussionAttachedFiles files={files} /> : null}

        {hasReplies ? (
          <div css={replyContainerStyles}>
            <div css={replyCountDividerStyles}>
              <span css={replyCountStyles}>
                {`${replies.length} ${
                  replies.length === 1 ? 'reply' : 'replies'
                }`}
              </span>
              <div css={replyLineSeparatorStyles} />
            </div>
            {replies.map((reply, index) => (
              <div key={index}>
                <UserComment
                  {...reply}
                  files={reply.files}
                  showTeamName={showTeamName}
                />
                {index < replies.length - 1 && (
                  <div css={replyContainerSeparatorStyles}>
                    <div css={replyLineSeparatorStyles} />
                  </div>
                )}
              </div>
            ))}
            {displayReplyButton && (
              <div css={replyButtonContainerStyles}>{replyButton}</div>
            )}
          </div>
        ) : (
          <div css={replySingleContainerStyles}>
            {displayReplyButton && replyButton}
          </div>
        )}
      </div>
    </>
  );
};

export default DiscussionCard;
