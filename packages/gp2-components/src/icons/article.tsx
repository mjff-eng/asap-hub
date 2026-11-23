import { pixels } from '@asap-hub/react-components';
import { FC } from 'react';

const { remUnit } = pixels;

interface ArticleIconProps {
  readonly color?: string;
  readonly size?: number;
}

const ArticleIcon: FC<ArticleIconProps> = ({
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
    <title>Article</title>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M19 1.8H8.20972L4.3 5.70972V21.5C4.3 21.8866 4.6134 22.2 5 22.2H19C19.3866 22.2 19.7 21.8866 19.7 21.5V2.5C19.7 2.1134 19.3866 1.8 19 1.8ZM6.2 1.8L7.5 0.5H19C20.1046 0.5 21 1.39543 21 2.5V21.5C21 22.6046 20.1046 23.5 19 23.5H5C3.89543 23.5 3 22.6046 3 21.5V5L4.3 3.7L6.2 1.8ZM9.85 8.5C9.85 8.22386 10.141 8 10.5 8C10.859 8 11.15 8.22386 11.15 8.5V19.5C11.15 19.7761 10.859 20 10.5 20C10.141 20 9.85 19.7761 9.85 19.5V8.5ZM6.85 14.5C6.85 14.2239 7.14102 14 7.5 14C7.85898 14 8.15 14.2239 8.15 14.5V19.5C8.15 19.7761 7.85898 20 7.5 20C7.14102 20 6.85 19.7761 6.85 19.5V14.5ZM13.5 10C13.141 10 12.85 10.2239 12.85 10.5V19.5C12.85 19.7761 13.141 20 13.5 20C13.859 20 14.15 19.7761 14.15 19.5V10.5C14.15 10.2239 13.859 10 13.5 10ZM15.85 12.4C15.85 12.1791 16.141 12 16.5 12C16.859 12 17.15 12.1791 17.15 12.4V19.6C17.15 19.8209 16.859 20 16.5 20C16.141 20 15.85 19.8209 15.85 19.6V12.4Z"
      fill={color}
    />
  </svg>
);

export default ArticleIcon;
