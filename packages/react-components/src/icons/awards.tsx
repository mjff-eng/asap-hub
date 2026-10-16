/* istanbul ignore file */
import { FC } from 'react';

interface AwardsIconProps {
  readonly color?: string;
  readonly size?: number;
}

const AwardsIcon: FC<AwardsIconProps> = ({ color = '#4D646B', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Awards</title>
    <path
      d="M7.50903 14.8129L3.24464 7.44625C3.06076 7.12841 2.97428 6.76357 2.99594 6.39701C3.0176 6.03045 3.14645 5.67833 3.36648 5.38435L4.87542 3.37869C5.05002 3.14589 5.27642 2.95694 5.5367 2.8268C5.79698 2.69666 6.08398 2.62891 6.37498 2.62891H17.6217C17.9127 2.62891 18.1997 2.69666 18.46 2.8268C18.7203 2.95694 18.9467 3.14589 19.1213 3.37869L20.6208 5.38435C20.8423 5.67738 20.9728 6.02902 20.9962 6.39559C21.0195 6.76217 20.9346 7.12752 20.752 7.44625L16.4877 14.8129M11.0611 12.0012L5.55022 2.81635M12.9356 12.0012L18.4465 2.81635M8.24944 7.31504H15.7473"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12.0006 21.3723C14.5887 21.3723 16.6867 19.2742 16.6867 16.6861C16.6867 14.0981 14.5887 12 12.0006 12C9.41251 12 7.31445 14.0981 7.31445 16.6861C7.31445 19.2742 9.41251 21.3723 12.0006 21.3723Z"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M11.9969 17.6245V15.75H11.5283"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default AwardsIcon;
