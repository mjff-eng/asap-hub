/* istanbul ignore file */

import { FC } from 'react';
import { remUnit } from '../pixels';

interface CategoryIconProps {
  readonly color?: string;
  readonly size?: number;
}
const CategoryIcon: FC<CategoryIconProps> = ({
  color = '#4D646B',
  size = 24,
}) => (
  <svg
    width={remUnit(size)}
    height={remUnit(size)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Category icon</title>
    <path
      d="M4 4H10V10H4V4ZM14 4H20V10H14V4ZM4 14H10V20H4V14ZM14 17C14 17.7956 14.3161 18.5587 14.8787 19.1213C15.4413 19.6839 16.2044 20 17 20C17.7956 20 18.5587 19.6839 19.1213 19.1213C19.6839 18.5587 20 17.7956 20 17C20 16.2044 19.6839 15.4413 19.1213 14.8787C18.5587 14.3161 17.7956 14 17 14C16.2044 14 15.4413 14.3161 14.8787 14.8787C14.3161 15.4413 14 16.2044 14 17Z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default CategoryIcon;
