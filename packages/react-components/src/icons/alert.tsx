/* istanbul ignore file */

import { FC } from 'react';
import { colour } from '../colors';

interface AlertProps {
  readonly color?: string;
}

const Alert: FC<AlertProps> = ({ color }) => (
  <svg
    width="24px"
    height="24px"
    viewBox="0 0 24 24"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
  >
    <title>Alert</title>
    <g
      id="Error-States"
      stroke="none"
      strokeWidth="1"
      fill="none"
      fillRule="evenodd"
    >
      <g
        id="1.3.1-Create-Account-Issue-/-Large-Desktop"
        transform="translate(-388.000000, -18.000000)"
      >
        <g id="Group-23">
          <g id="Group-7" transform="translate(388.000000, 6.000000)">
            <g
              id="1.3.1-Create-Account-/-Large-Desktop"
              transform="translate(0.000000, 12.000000)"
            >
              <g id="Group-3">
                <g id="Group-16">
                  <g id="Group-15">
                    <g id="Group-10">
                      <g id="Group-4"></g>
                      <rect
                        fill={color || colour.neutral[100]}
                        id="Rectangle"
                        x="0"
                        y="0"
                        width="24"
                        height="24"
                        rx="12"
                      ></rect>
                      <g
                        id="Group-9"
                        transform="translate(10.000000, 4.000000)"
                        fill="#FFFFFF"
                      >
                        <g
                          id="Group-8"
                          transform="translate(0.500000, 0.000000)"
                        >
                          <g
                            id="Group-9"
                            transform="translate(0.241071, 0.000000)"
                          >
                            <circle
                              id="Oval"
                              cx="1.6875"
                              cy="13.2589286"
                              r="1.6875"
                            ></circle>
                            <polygon
                              id="Rectangle"
                              points="0 0.321428571 3.375 0.321428571 2.73214286 9.32142857 0.642857143 9.32142857"
                            ></polygon>
                          </g>
                        </g>
                      </g>
                    </g>
                  </g>
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>
    </g>
  </svg>
);

export default Alert;
