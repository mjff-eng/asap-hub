import { css } from '@emotion/react';
import React from 'react';
import { cssColour, colour } from '../colors';
import { cookieIcon } from '../icons';

type CookieButtonProps = {
  toggleCookieModal: () => void;
};

const iconStyles = css({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '0.5em',
  backgroundColor: colour.background.secondary,
  borderRadius: '4px',
  cursor: 'pointer',
  border: `1.5px solid ${cssColour(colour.neutral[100], 0.3)}`,
});

const CookieButton: React.FC<CookieButtonProps> = ({ toggleCookieModal }) => (
  <span
    className="cookie-button"
    css={iconStyles}
    onClick={toggleCookieModal}
    data-testid="cookie-button"
  >
    {cookieIcon}
  </span>
);
export default CookieButton;
