const externalUserAvatar = (
  <svg
    width="26"
    height="26"
    viewBox="0 0 26 26"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>External user</title>
    <clipPath id="external-user-avatar-clip">
      <circle cx="13" cy="13" r="12" />
    </clipPath>
    <g clipPath="url(#external-user-avatar-clip)">
      <rect width="26" height="26" fill="#EDF1F3" />
      <circle cx="13" cy="10" r="3.5" fill="white" />
      <rect
        x="6.75"
        y="15.25"
        width="12.5"
        height="12"
        rx="2.25"
        fill="white"
      />
    </g>
    <circle cx="13" cy="13" r="12.5" stroke="white" />
  </svg>
);

export default externalUserAvatar;
