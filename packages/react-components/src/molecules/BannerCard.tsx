import { ReactElement, ReactNode } from 'react';
import { css, CSSObject } from '@emotion/react';

import {
  ceruleanFernGradientStyles,
  magentaCeruleanGradientStyles,
} from '../appearance';
import { rem } from '../pixels';
import { colour } from '../colors';
import { paddingStyles, borderRadius } from '../card';
import { Card } from '../atoms';
import { validTickIcon, warningTransparentIcon } from '../icons';

const gradientStyles: Record<BannerCardProps['type'], CSSObject> = {
  success: ceruleanFernGradientStyles,
  warning: magentaCeruleanGradientStyles,
};
const bannerStyles = css({
  borderTopLeftRadius: borderRadius,
  borderTopRightRadius: borderRadius,
  height: rem(36),
  padding: `${rem(24)} 0`,

  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',

  svg: { stroke: colour.neutral[0].rgb, fill: colour.neutral[0].rgb },
});

const contentStyles = css({
  paddingTop: rem(24),
  paddingBottom: rem(24),

  textAlign: 'center',
});

const icons: Record<BannerCardProps['type'], ReactElement> = {
  success: validTickIcon,
  warning: warningTransparentIcon,
};

interface BannerCardProps {
  readonly children: ReactNode;
  readonly type: 'success' | 'warning';
}
const BannerCard: React.FC<BannerCardProps> = ({ type, children }) => (
  <Card padding={false}>
    <div role="presentation" css={[gradientStyles[type], bannerStyles]}>
      {icons[type]}
    </div>
    <div css={[paddingStyles, contentStyles]}>{children}</div>
  </Card>
);

export default BannerCard;
