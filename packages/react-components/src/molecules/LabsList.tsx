import { css } from '@emotion/react';
import { LabResponse } from '@asap-hub/model';
import { colour } from '../colors';
import { rem } from '../pixels';
import { OverflowBadge } from '../atoms';

const containerStyles = css({
  display: 'flex',
  flexDirection: 'column',
});

const labTextStyles = css({
  color: colour.foreground.quaternary,
  fontSize: rem(17),
});

type LabsListProps = {
  readonly labs: readonly LabResponse[];
  readonly maxVisible?: number;
};

const LabsList: React.FC<LabsListProps> = ({ labs, maxVisible = 2 }) => {
  if (labs.length === 0) return null;

  const visible = labs.slice(0, maxVisible);
  const overflow = labs.length - maxVisible;

  return (
    <div css={containerStyles}>
      {visible.map((lab, index) => (
        <div key={lab.id} css={labTextStyles}>
          {lab.name} Lab
          {index === visible.length - 1 && overflow > 0 && (
            <OverflowBadge count={overflow} />
          )}
        </div>
      ))}
    </div>
  );
};

export default LabsList;
