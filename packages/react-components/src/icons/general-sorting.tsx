/* istanbul ignore file */

interface GeneralSortingIconProps {
  readonly active?: boolean;
  readonly description?: string;
}

const GeneralSortingIcon: React.FC<GeneralSortingIconProps> = ({
  active = false,
  description = '',
}) => {
  const title = active
    ? `${description} Active General Sort Icon`
    : `${description} Inactive General Sort Icon`;
  const fill = active ? '#00202C' : '#C2C9CE';

  return (
    <svg
      width="1.5rem"
      height="1.5rem"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <path d="M3 6H21" stroke={fill} strokeWidth="1.5" />
      <path d="M5 10H19" stroke={fill} strokeWidth="1.5" />
      <path d="M7 14H17" stroke={fill} strokeWidth="1.5" />
      <path d="M9 18H15" stroke={fill} strokeWidth="1.5" />
    </svg>
  );
};
export default GeneralSortingIcon;
