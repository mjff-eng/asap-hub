import { Card, pixels, colour } from '@asap-hub/react-components';

import { css } from '@emotion/react';

type CardWithBackgroundProps = {
  image: string;
  children?: React.ReactNode;
};
const { rem } = pixels;

const containerStyles = (image: string) =>
  css({
    backgroundImage: `url(${image})`,
    borderRadius: rem(8),
    backgroundSize: 'cover',
    padding: rem(16),
    border: `1px solid ${colour.border.tertiary}`,
    filter: `drop-shadow(0px 2px 4px ${colour.neutral[100]})`,
  });

const CardWithBackground: React.FC<CardWithBackgroundProps> = ({
  image,
  children,
}) => (
  <div css={containerStyles(image)}>
    <Card>{children}</Card>
  </div>
);

export default CardWithBackground;
