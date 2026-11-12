import { pixels } from '@asap-hub/react-components';
import { css } from '@emotion/react';

import { mobileQuery } from '../layout';

const { rem } = pixels;

const bannerStyles = (image: string, position: string) =>
  css({
    width: '100%',
    height: rem(72),
    backgroundImage: `url(${image})`,
    backgroundSize: 'cover',
    backgroundPosition: position,
    [mobileQuery]: {
      height: rem(48),
    },
  });

type ImageBannerProps = {
  readonly image: string;
  readonly position?: string;
};

const ImageBanner: React.FC<ImageBannerProps> = ({
  image,
  position = 'center',
}) => <div role="presentation" css={bannerStyles(image, position)} />;

export default ImageBanner;
