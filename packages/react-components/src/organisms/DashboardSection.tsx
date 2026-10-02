import { css } from '@emotion/react';
import { ReactNode } from 'react';

import { Headline2, Link } from '../atoms';
import { colour } from '../colors';
import { rem } from '../pixels';

const infoStyles = css({
  color: colour.foreground.tertiary,
  padding: `${rem(3)} 0 ${rem(24)}`,
  lineHeight: rem(24),
});

const viewAllStyles = css({
  marginTop: rem(24),
  textAlign: 'right',
});

type DashboardSectionProps = {
  title: string;
  description: string;
  children: ReactNode;
  /** When set, renders a "View All →" link below the content. */
  viewAllHref?: string;
  viewAllTestId?: string;
};

const DashboardSection: React.FC<DashboardSectionProps> = ({
  title,
  description,
  children,
  viewAllHref,
  viewAllTestId,
}) => (
  <div>
    <Headline2 styleAsHeading={3}>{title}</Headline2>
    <div css={infoStyles}>{description}</div>
    {children}
    {viewAllHref && (
      <p css={viewAllStyles} data-testid={viewAllTestId}>
        <Link href={viewAllHref}>View All →</Link>
      </p>
    )}
  </div>
);

export default DashboardSection;
