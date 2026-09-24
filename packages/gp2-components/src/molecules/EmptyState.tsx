import { Display, Paragraph, pixels } from '@asap-hub/react-components';
import { css } from '@emotion/react';
import { ReactChild } from 'react';

const { rem } = pixels;

interface EmptyStateProps {
  icon: ReactChild;
  title: string;
  description: string;
  paddingTop?: number;
}

const styles = css({
  display: 'grid',
  textAlign: 'center',
});

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  paddingTop = 48,
}) => (
  <div css={[styles, { padding: `${rem(paddingTop)} 0 ${rem(48)}` }]}>
    <span>{icon}</span>
    <div>
      <Display styleAsHeading={3}>{title}</Display>
      <Paragraph accent="tertiary">{description}</Paragraph>
    </div>
  </div>
);

export default EmptyState;
