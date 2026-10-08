import { css } from '@emotion/react';

import { colour } from '../colors';

const buttonResetStyles = css({
  padding: 0,
  border: 'none',
  outline: 'none',
});
const styles = css({
  width: '100%',
  height: '100%',
  backgroundColor: colour.neutral[900],

  visibility: 'hidden',
  opacity: 0,
  transition: `opacity 250ms linear, visibility 0s 250ms`,
});
const shownStyles = css({
  visibility: 'visible',
  opacity: 0.7,
  transition: `opacity 250ms linear`,
});
interface OverlayProps {
  shown?: boolean;
  onClick?: () => void;
}
const Overlay: React.FC<OverlayProps> = ({ shown = true, onClick }) => (
  <button
    aria-label="Close"
    css={[buttonResetStyles, styles, shown && shownStyles]}
    disabled={!onClick}
    onClick={onClick}
  />
);

export default Overlay;
