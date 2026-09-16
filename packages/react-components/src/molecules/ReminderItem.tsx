import React from 'react';
import { css } from '@emotion/react';
import { ReminderResponse, gp2 as gp2Model } from '@asap-hub/model';

import { rem } from '../pixels';
import {
  EventIcon,
  infoCircleIcon,
  LibraryIcon,
  MilestoneIcon,
  article,
} from '../icons';
import { Anchor, Markdown } from '../atoms';
import { neutral200, cerulean } from '../colors';

export type ReminderEntity =
  | ReminderResponse['entity']
  | gp2Model.ReminderResponse['entity'];

const containerStyle = css({
  display: 'grid',
  gridAutoFlow: 'column',
  gridTemplateColumns: 'min-content 1fr',
  columnGap: rem(15),
  alignContent: 'center',
  padding: rem(8),
});

const iconStyles = css({
  display: 'inline-block',
  width: rem(24),
  height: rem(24),
});

const linkStyles = css({
  ':hover': {
    borderRadius: rem(3),
    background: neutral200.rgb,
  },
});

const descriptionStyles = css({
  '& div > p': {
    margin: '0',
  },
});

const subtextStyles = css({
  display: 'flex',
  alignItems: 'start',
  marginTop: rem(12),
  gap: rem(8),
});

const timeElapsedStyles = css({
  color: cerulean.rgb,
});

const iconMap: Record<ReminderEntity, React.ReactElement> = {
  Output: <LibraryIcon />,
  'Output Version': <LibraryIcon />,
  'Research Output': <LibraryIcon />,
  'Research Output Version': <LibraryIcon />,
  Event: <EventIcon />,
  Manuscript: <LibraryIcon />,
  Discussion: <LibraryIcon />,
  Milestone: <MilestoneIcon />,
};

type ReminderProps = Pick<
  ReminderResponse,
  'description' | 'href' | 'date' | 'subtext'
> & {
  entity?: ReminderEntity;
};

export const getTimeElapsed = (isoDate: string): string => {
  const date = new Date(isoDate);
  const now = new Date();

  const secondsElapsed = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (secondsElapsed < 3600) {
    return `${Math.floor(secondsElapsed / 60)}m`;
  }
  if (secondsElapsed < 86400) {
    return `${Math.floor(secondsElapsed / 3600)}h`;
  }
  return `${Math.floor(secondsElapsed / 86400)}d`;
};

const ReminderItem: React.FC<ReminderProps> = ({
  entity,
  description,
  subtext,
  href,
  date,
}) => {
  const content = (
    <>
      <span css={iconStyles}>{entity ? iconMap[entity] : infoCircleIcon}</span>
      <span css={descriptionStyles}>
        <Markdown value={description} />
        {subtext && (
          <div css={subtextStyles}>
            <span css={iconStyles}>{article}</span>
            <span>{subtext}</span>
          </div>
        )}
      </span>
      {date && <span css={timeElapsedStyles}>{getTimeElapsed(date)}</span>}
    </>
  );

  return href ? (
    <Anchor href={href} css={[containerStyle, linkStyles]}>
      {content}
    </Anchor>
  ) : (
    <div css={containerStyle}>{content}</div>
  );
};

export default ReminderItem;
