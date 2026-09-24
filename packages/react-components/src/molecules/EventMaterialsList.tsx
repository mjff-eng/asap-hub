import { Fragment } from 'react';
import { css } from '@emotion/react';

import { BasicEvent } from '@asap-hub/model';
import { events } from '@asap-hub/routing';
import { useFlags } from '@asap-hub/react-context';

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

export type MaterialType = 'notes' | 'videoRecording' | 'presentation';

const DEFAULT_ORDER: MaterialType[] = [
  'videoRecording',
  'presentation',
  'notes',
];

const eventMaterialLabels: Record<MaterialType, string> = {
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
> & {
  order?: MaterialType[];
  showIcon?: boolean;
};

const EventMaterialsList: React.FC<EventMaterialsListProps> = ({
  id,
  notes,
  videoRecording,
  presentation,
  order = DEFAULT_ORDER,
  showIcon = true,
}) => {
  const { isEnabled } = useFlags();
  const materials = { notes, videoRecording, presentation };
  const isMaterialAvailable = (key: MaterialType): boolean =>
    Boolean(materials[key]);
  const eventRoute = events({}).event({ eventId: id });
  const eventHref = isEnabled('NEW_EVENT_PAGE')
    ? eventRoute.meetingMaterials({}).$
    : eventRoute.$;
  const noneAvailable = !order.some(isMaterialAvailable);

  return (
    <span css={[containerStyles, noneAvailable && mutedIconStyles]}>
      {showIcon && paperClipIcon}
      <span css={materialListStyles}>
        {order.map((key, index) => {
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
