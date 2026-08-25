import { css } from '@emotion/react';
import React from 'react';
import { colorWithTransparency, neutral200, neutral500 } from '../colors';
import { cookieIcon } from '../icons';

type CookieButtonProps = {
  toggleCookieModal: () => void;
};

const iconStyles = css({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '0.5em',
  backgroundColor: neutral200.rgb,
  borderRadius: '4px',
  cursor: 'pointer',
  border: `1.5px solid ${colorWithTransparency(neutral500, 0.3).rgba}`,
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
