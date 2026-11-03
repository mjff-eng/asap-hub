import { colour } from '../colors';

// Fills go in style because SVG presentation attributes don't resolve var().
const externalUserAvatar = (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>External user</title>
    <circle
      cx="12"
      cy="12"
      r="12"
      style={{ fill: colour.background.quaternary }}
    />
    <g style={{ fill: colour.foreground['quaternary-inverse'] }}>
      <path d="M6.77307 18C6.77307 18.3093 7.02395 18.5601 7.33323 18.5601H16.6668C16.976 18.56 17.2262 18.3092 17.2262 18V16.6664C17.2261 15.8108 16.8866 14.9902 16.2817 14.3851C15.6765 13.78 14.8554 13.4398 13.9996 13.4398H9.99963C9.14396 13.4399 8.32344 13.7801 7.71838 14.3851C7.11333 14.9902 6.77314 15.8107 6.77307 16.6664V18Z" />
      <path d="M11.9996 11.8929C13.7817 11.8929 15.2262 10.4484 15.2262 8.66638C15.2261 6.88446 13.7816 5.43982 11.9996 5.43982C10.2178 5.43996 8.77321 6.88455 8.77307 8.66638C8.77307 10.4483 10.2177 11.8928 11.9996 11.8929Z" />
    </g>
  </svg>
);

export default externalUserAvatar;
