/* istanbul ignore file */

type HashtagIconProps = {
  title: string;
};

const HashtagIcon: React.FC<HashtagIconProps> = ({ title }) => (
  <svg
    width="1.5rem"
    height="1.5rem"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>{title}</title>
    <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M9.365 13.3333L9.6275 10.6667H7V9.33333H9.75938L10.0875 6H11.3444L11.0162 9.33333H13.5094L13.8375 6H15.0944L14.7663 9.33333H17V10.6667H14.635L14.3725 13.3333H17V14.6667H14.2406L13.9125 18H12.6556L12.9838 14.6667H10.4906L10.1625 18H8.90562L9.23375 14.6667H7V13.3333H9.365ZM10.6219 13.3333H13.1156L13.3781 10.6667H10.8844L10.6219 13.3333Z"
      fill="currentColor"
    />
  </svg>
);
export default HashtagIcon;
