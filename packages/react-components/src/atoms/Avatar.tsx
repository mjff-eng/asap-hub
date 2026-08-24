import { css, SerializedStyles } from '@emotion/react';

import {
  silver,
  mint,
  apricot,
  clay,
  info100,
  azure,
  space,
  lilac,
  berry,
  lavender,
  mauve,
  lead,
  steel,
  colour,
  info900,
} from '../colors';
import { rem } from '../pixels';
import { headlineStyles, fontStyles } from '../text';

const hash = (str: string) => {
  let h = 0;
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    h = (h << 5) - h + chr; // eslint-disable-line no-bitwise
    h |= 0; // eslint-disable-line no-bitwise
  }
  return h;
};

const minWidth = 24;
const maxWidth = 90;

const borderPadding = 4;
const borderWidth = 1;

const ringStyle = css({
  boxSizing: 'border-box',
  minWidth: rem(minWidth),
  width: `min(100%, ${rem(maxWidth)})`,

  // margin only for Avatars that get all the space (max) they want
  margin: `clamp(0px, calc(100% - ${maxWidth - 12}px), 12px) 0`,
});

const ringBorderStyle = css({
  padding: rem(borderPadding),

  borderWidth,
  borderStyle: 'solid',
  borderRadius: '50%',
  borderColor: silver.rgb,
});
const placeholderStyle = css({
  borderWidth: '1px',
  borderStyle: 'solid',
  borderRadius: '50%',
  borderColor: steel.rgb,
});

const circleStyle = css({
  margin: 0,
  borderRadius: '50%',
});

const imageStyle = (imageUrl: string) =>
  css({
    backgroundImage: `url(${JSON.stringify(imageUrl)})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  });

const initialsStyle = css({
  display: 'grid',
  justifyContent: 'stretch',
  alignContent: 'stretch',
});
const textStyle = css(fontStyles, headlineStyles[3], {
  dominantBaseline: 'central',
  textAnchor: 'middle',
  fontSize: '2.25em',
});

const placeholderColorStyle = css({
  backgroundColor: colour.neutral[0].rgb,
  fill: lead.rgb,
});
const colorStyles = [
  css({ backgroundColor: mint.rgb, fill: colour.brand.crn[800].rgb }),
  css({ backgroundColor: apricot.rgb, fill: clay.rgb }),
  css({ backgroundColor: info100.rgb, fill: info900.rgb }),
  css({ backgroundColor: azure.rgb, fill: space.rgb }),
  css({ backgroundColor: lilac.rgb, fill: berry.rgb }),
  css({ backgroundColor: lavender.rgb, fill: mauve.rgb }),
];

type RegularAvatarProps = {
  readonly imageUrl?: string;
  readonly firstName?: string;
  readonly lastName?: string;

  readonly placeholder?: undefined;
};
type PlaceholderAvatarProps = {
  readonly imageUrl?: undefined;
  readonly firstName?: undefined;
  readonly lastName?: undefined;

  readonly placeholder?: string;
};
type AvatarProps = (RegularAvatarProps | PlaceholderAvatarProps) & {
  readonly border?: boolean;
  readonly overrideStyles?: SerializedStyles;
};

const Avatar: React.FC<AvatarProps> = ({
  imageUrl,
  firstName = '',
  lastName = '',
  placeholder = '',
  border = false,
  overrideStyles,
}) => {
  const name = `${firstName}${firstName && lastName ? ' ' : ''}${lastName}`;
  const initials = (firstName?.[0] ?? '') + (lastName?.[0] ?? '');

  return (
    <div
      css={[
        ringStyle,
        border && ringBorderStyle,
        placeholder && placeholderStyle,
        overrideStyles,
      ]}
    >
      <p
        role="img"
        aria-label={`Profile picture${
          placeholder
            ? ` placeholder: ${placeholder}`
            : name
              ? ` of ${name}`
              : ''
        }`}
        css={[
          circleStyle,
          initialsStyle,
          placeholder
            ? placeholderColorStyle
            : imageUrl
              ? null
              : colorStyles[hash(initials) % colorStyles.length],
          imageUrl && imageStyle(imageUrl),
        ]}
      >
        <svg viewBox="0 0 90 90" css={imageUrl && { visibility: 'hidden' }}>
          <text x="50%" y="50%" css={textStyle}>
            {placeholder || initials}
          </text>
        </svg>
      </p>
    </div>
  );
};

export default Avatar;
