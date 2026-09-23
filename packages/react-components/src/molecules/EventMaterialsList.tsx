import { Fragment } from 'react';
import { css } from '@emotion/react';

import { BasicEvent } from '@asap-hub/model';
import { events } from '@asap-hub/routing';

import { eventMaterialSectionIds } from '../organisms/EventMaterials';
import { Link } from '../atoms';
import { paperClipIcon } from '../icons';
import { tin } from '../colors';
import { rem } from '../pixels';

const containerStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(8),

  svg: {
    flexShrink: 0,
    width: rem(16),
    height: rem(16),
  },
});

const mutedIconStyles = css({
  'svg path[stroke]': {
    stroke: tin.rgb,
  },
});

const displayedMaterialTypes = [
  'videoRecording',
  'presentation',
  'notes',
] as const;

const eventMaterialLabels: Record<
  (typeof displayedMaterialTypes)[number],
  string
> = {
  videoRecording: 'Recording',
  presentation: 'Presentation',
  notes: 'Notes',
};

const materialListStyles = css({
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'wrap',
  columnGap: rem(8),
  rowGap: rem(4),

  a: {
    color: 'inherit',
    textDecoration: 'none',
    ':hover': {
      textDecoration: 'underline',
    },
  },
});

const unavailableMaterialStyles = css({
  color: tin.rgb,
});

type EventMaterialsListProps = Pick<
  BasicEvent,
  'id' | 'notes' | 'videoRecording' | 'presentation'
>;

const EventMaterialsList: React.FC<EventMaterialsListProps> = ({
  id,
  notes,
  videoRecording,
  presentation,
}) => {
  const materials = { notes, videoRecording, presentation };
  const isMaterialAvailable = (
    key: (typeof displayedMaterialTypes)[number],
  ): boolean => Boolean(materials[key]);
  const eventHref = events({}).event({ eventId: id }).$;
  const noneAvailable = !displayedMaterialTypes.some(isMaterialAvailable);

  return (
    <span css={[containerStyles, noneAvailable && mutedIconStyles]}>
      {paperClipIcon}
      <span css={materialListStyles}>
        {displayedMaterialTypes.map((key, index) => {
          const available = isMaterialAvailable(key);
          return (
            <Fragment key={key}>
              {index > 0 && (
                <span css={available ? undefined : unavailableMaterialStyles}>
                  •
                </span>
              )}
              {available ? (
                <Link href={`${eventHref}#${eventMaterialSectionIds[key]}`}>
                  {eventMaterialLabels[key]}
                </Link>
              ) : (
                <span css={unavailableMaterialStyles}>
                  {eventMaterialLabels[key]}
                </span>
              )}
            </Fragment>
          );
        })}
      </span>
    </span>
  );
};

export default EventMaterialsList;
