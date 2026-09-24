import { eventMaterialTypes } from '@asap-hub/model';
import { css } from '@emotion/react';
import { charcoal, neutral700 } from '../colors';
import { crossSmallIcon, tickSmallIcon } from '../icons';
import { rem } from '../pixels';

const baseStyles = css({
  display: 'grid',
  gridAutoFlow: 'column',
  gridTemplateColumns: 'min-content',
  columnGap: rem(3),
});

const availableStyles = css({
  color: charcoal.rgb,
  svg: {
    fill: charcoal.rgb,
    stroke: charcoal.rgb,
  },
});

const unavailableStyles = css({
  color: neutral700.rgb,
  svg: {
    fill: neutral700.rgb,
    stroke: neutral700.rgb,
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
