/* istanbul ignore file */

interface NumericalSortingIconProps {
  readonly active?: boolean;
  readonly ascending?: boolean;
  readonly description?: string;
}

const NumericalSortingIcon: React.FC<NumericalSortingIconProps> = ({
  active = false,
  ascending = false,
  description = '',
}) => {
  const title = active
    ? ascending
      ? `${description} Active Numerical Ascending Sort Icon`
      : `${description} Active Numerical Descending Sort Icon`
    : ascending
      ? `${description} Inactive Numerical Ascending Sort Icon`
      : `${description} Inactive Numerical Descending Sort Icon`;
  const fill = active ? '#00202C' : '#C2C9CE';
  const d = ascending
    ? 'M3 3.75V5.25H4.5V3.75H3ZM15.75 3.75V17.766L13.8045 15.8205L12.75 16.875L15.96 20.1097L16.5 20.625L17.04 20.109L20.25 16.875L19.1955 15.8205L17.25 17.7653V3.75H15.75ZM3 6.75V8.25H6V6.75H3ZM3 9.75V11.25H7.5V9.75H3ZM3 12.75V14.25H9V12.75H3ZM3 15.75V17.25H10.5V15.75H3ZM3 18.75V20.25H12V18.75H3Z'
    : 'M3 3.75V5.25H12V3.75H3ZM15.75 3.75V17.766L13.8045 15.8205L12.75 16.875L15.96 20.1097L16.5 20.625L17.04 20.109L20.25 16.875L19.1955 15.8205L17.25 17.7653V3.75H15.75ZM3 6.75V8.25H10.5V6.75H3ZM3 9.75V11.25H9V9.75H3ZM3 12.75V14.25H7.5V12.75H3ZM3 15.75V17.25H6V15.75H3ZM3 18.75V20.25H4.5V18.75H3Z';
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
export default NumericalSortingIcon;
