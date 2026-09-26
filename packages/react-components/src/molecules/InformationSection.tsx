import { css } from '@emotion/react';

import { colour } from '../colors';
import { rem } from '../pixels';
import { informationIcon } from '../icons';

const containerStyles = css({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: rem(16),
  padding: rem(16),
  backgroundColor: colour.background.info,
  borderRadius: rem(8),
  border: `1px solid ${colour.border.info}`,
});

const iconContainerStyles = css({
  display: 'flex',
  alignItems: 'center',
  width: rem(24),
  height: rem(24),
});

const textStyles = css({
  color: colour.foreground.info,
  fontSize: rem(17),
  fontWeight: 400,
  verticalAlign: 'middle',
});

type InformationSectionProps = {
  children: React.ReactNode;
};

const InformationSection = ({ children }: InformationSectionProps) => (
  <div css={containerStyles}>
    <div css={iconContainerStyles}>{informationIcon}</div>
    <span css={textStyles}>{children}</span>
  </div>
);

export default InformationSection;
