/* istanbul ignore file */

interface AlphabeticalSortingIconProps {
  readonly active?: boolean;
  readonly ascending?: boolean;
  readonly description?: string;
}

const AlphabeticalSortingIcon: React.FC<AlphabeticalSortingIconProps> = ({
  active = false,
  ascending = false,
  description = '',
}) => {
  const title = active
    ? ascending
      ? `${description} Active Alphabetical Ascending Sort Icon`
      : `${description} Active Alphabetical Descending Sort Icon`
    : ascending
      ? `${description} Inactive Alphabetical Ascending Sort Icon`
      : `${description} Inactive Alphabetical Descending Sort Icon`;
  const fill = active ? '#00202C' : '#C2C9CE';
  const d = ascending
    ? 'M6.141 3.75L5.976 4.242L4.524 8.25H4.5V8.29725L3.7965 10.242L3.75 10.359V11.25H5.25V10.617L5.5545 9.75H7.9455L8.25 10.617V11.25H9.75V10.359L9.70275 10.242L9 8.2965V8.25H8.9775L7.5225 4.242L7.3605 3.75H6.13875H6.141ZM16.5 3.75V17.766L14.5545 15.8205L13.5 16.875L16.71 20.1097L17.25 20.625L17.79 20.109L21 16.875L19.9455 15.8205L18 17.7653V3.75H16.5ZM6.75 6.492L7.383 8.25H6.117L6.75 6.492ZM3.75 12.75V14.25H7.92225L3.96 18.21L3.75 18.4455V20.25H9.75V18.75H5.57775L9.53925 14.79L9.74925 14.5545V12.75H3.75Z'
    : 'M3.75 3.75V5.25H7.92225L3.96 9.21L3.75 9.4455V11.25H9.75V9.75H5.57775L9.53925 5.79L9.74925 5.5545V3.75H3.75ZM16.5 3.75V17.766L14.5545 15.8205L13.5 16.875L16.71 20.1097L17.25 20.625L17.79 20.109L21 16.875L19.9455 15.8205L18 17.7653V3.75H16.5ZM6.14025 12.75L5.97675 13.242L4.5225 17.25H4.5V17.2972L3.7965 19.242L3.75 19.3597V20.25H5.25V19.617L5.5545 18.75H7.9455L8.25 19.617V20.25H9.75V19.359L9.70275 19.242L9 17.2972V17.25H8.9775L7.5225 13.242L7.3605 12.75H6.13875H6.14025ZM6.75 15.492L7.383 17.25H6.117L6.75 15.492Z';
  return (
    <svg
      width="1.5rem"
      height="1.5rem"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <path d={d} fill={fill} />
    </svg>
  );
};
export default AlphabeticalSortingIcon;
