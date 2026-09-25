import { css } from '@emotion/react';
import { Paragraph, Spinner } from '../atoms';
import { rem } from '../pixels';
import { colour } from '..';

const loadingContainerStyles = css({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
  minHeight: 400,
  gap: rem(12),
});

const Loading: React.FC<Record<string, never>> = () => (
  <div css={[loadingContainerStyles]}>
    <Spinner
      size={18}
      color={colour.neutral[700]}
      trackColor={colour.general.blue.cerulean[25]}
    />
    <Paragraph noMargin>Loading...</Paragraph>
  </div>
);

export default Loading;
