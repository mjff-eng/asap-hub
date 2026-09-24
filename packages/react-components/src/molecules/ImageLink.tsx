import type { EmotionJSX } from '@emotion/react/types/jsx-namespace';
import { css } from '@emotion/react';
import { Anchor } from '../atoms';
import { colour } from '../colors';

export const hoverStyle = css({
  transition: `100ms ease-in-out, color 100ms ease-in-out`,
  ':hover': {
    color: colour.brand.crn[500],
    opacity: '64%',
  },
});

interface ImageLinkProps {
  link: string;
  children?: EmotionJSX.Element | string;
}

const ImageLink: React.FC<ImageLinkProps> = ({ link, children }) => (
  <Anchor css={hoverStyle} href={link}>
    {children}
  </Anchor>
);

export default ImageLink;
