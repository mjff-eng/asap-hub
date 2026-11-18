/* istanbul ignore file */
import { FC } from 'react';
import { remUnit } from '../pixels';

interface LibraryIconProps {
  readonly color?: string;
  readonly size?: number;
}

const LibraryIcon: FC<LibraryIconProps> = ({
  color = '#4D646B',
  size = 24,
}) => (
  <svg
    width={remUnit(size)}
    height={remUnit(size)}
    viewBox="0 0 24 24"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    stroke={color}
  >
    <title>Research</title>
    <defs>
      <polygon id="path-1" points="0 24 24 24 24 0 0 0"></polygon>
    </defs>
    <g id="SharedResearch" strokeWidth="1" fill="none" fillRule="evenodd">
      <g id="Group-12-Copy-2">
        <g id="Group-15"></g>
      </g>
      <g id="Group-21">
        <g id="Group-22-Copy">
          <g id="Group-14">
            <mask id="mask-2" fill="white">
              <use xlinkHref="#path-1"></use>
            </mask>
            <g id="Clip-12"></g>
            <polygon
              id="Stroke-11"
              strokeWidth="1.3"
              strokeLinecap="square"
              strokeLinejoin="round"
              mask="url(#mask-2)"
              points="8.02 21.253 12.933 21.253 12.933 2.765 8.02 2.765"
            ></polygon>
            <polygon
              id="Stroke-13"
              strokeWidth="1.3"
              strokeLinecap="square"
              strokeLinejoin="round"
              mask="url(#mask-2)"
              points="3.102 21.253 8.015 21.253 8.015 6.044 3.102 6.044"
            ></polygon>
          </g>
          <line
            x1="9.0148"
            y1="6.0443"
            x2="11.9308"
            y2="6.0443"
            id="Stroke-15"
            strokeWidth="0.8"
            strokeLinecap="square"
            strokeLinejoin="round"
          ></line>
          <g
            id="Group-20"
            transform="translate(4.000000, 5.000000)"
            strokeLinecap="square"
            strokeLinejoin="round"
          >
            <line
              x1="0.1007"
              y1="12.8441"
              x2="3.1007"
              y2="12.8441"
              id="Stroke-16"
              strokeWidth="0.8"
            ></line>
            <polygon
              id="Stroke-18"
              strokeWidth="1.3"
              points="16.8986 15.1439 12.0926 16.1649 8.9306 1.2899 13.7366 0.2679"
            ></polygon>
          </g>
          <path
            d="M15.9387236,17.7142528 L19.734148,16.9074883 L15.9387236,17.7142528 Z"
            id="Stroke-21"
            strokeWidth="0.8"
            strokeLinecap="square"
            strokeLinejoin="round"
          ></path>
        </g>
      </g>
    </g>
  </svg>
);

export default LibraryIcon;
