import { ReactNode } from 'react';
import { css } from '@emotion/react';

import { Card } from '../atoms';
import { rem } from '../pixels';
import { headlineStyles } from '../text';
import { neutral900 } from '../colors';

const containerStyles = css({
  padding: `${rem(15)} ${rem(18)}`,
  color: neutral900.rgb,
});

type UserProfilePlaceholderCardProps = {
  title?: string;
  children: ReactNode;
};

const UserProfilePlaceholderCard: React.FC<UserProfilePlaceholderCardProps> = ({
  title,
  children,
}) => (
  <Card padding={false} accent="placeholder">
    <div css={containerStyles}>
      {title && (
        <h4 css={(headlineStyles[5], [{ margin: 0, color: neutral900.rgb }])}>
          {title}
        </h4>
      )}
      <span>{children}</span>
    </div>
  </Card>
);

export default UserProfilePlaceholderCard;
