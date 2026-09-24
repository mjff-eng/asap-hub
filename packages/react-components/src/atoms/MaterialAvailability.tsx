import { eventMaterialTypes } from '@asap-hub/model';
import { css } from '@emotion/react';
import { colour } from '../colors';
import { crossSmallIcon, tickSmallIcon } from '../icons';
import { rem } from '../pixels';

const baseStyles = css({
  display: 'grid',
  gridAutoFlow: 'column',
  gridTemplateColumns: 'min-content',
  columnGap: rem(3),
});

const availableStyles = css({
  color: colour.foreground.primary,
  svg: {
    fill: colour.foreground.primary,
    stroke: colour.foreground.primary,
  },
});

const unavailableStyles = css({
  color: colour.neutral[200],
  svg: {
    fill: colour.neutral[200],
    stroke: colour.neutral[200],
  },
});

const typeToReadable: Record<(typeof eventMaterialTypes)[number], string> = {
  meetingMaterials: 'Additional Materials',
  notes: 'Notes',
  presentation: 'Presentations',
  videoRecording: 'Videos',
};

type MaterialAvailabilityProps = {
  meetingMaterial: string | null | undefined;
  meetingMaterialType: (typeof eventMaterialTypes)[number];
};

const MaterialAvailability: React.FC<MaterialAvailabilityProps> = ({
  meetingMaterial,
  meetingMaterialType,
}) => {
  const readableType = typeToReadable[meetingMaterialType];
  return (
    <div
      css={[baseStyles, meetingMaterial ? availableStyles : unavailableStyles]}
    >
      {meetingMaterial ? tickSmallIcon : crossSmallIcon}{' '}
      {meetingMaterial && readableType}
      {meetingMaterial === undefined && `${readableType} coming soon`}
      {meetingMaterial === null && `No ${readableType.toLocaleLowerCase()}`}
    </div>
  );
};

export default MaterialAvailability;
