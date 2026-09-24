import { css, Theme } from '@emotion/react';
import {
  neutral900,
  neutral1000,
  charcoal,
  colour,
  neutral500,
  success100,
  neutral300,
  colorFromHex,
} from '../colors';
import { crossSmallIcon } from '../icons';
import { rem } from '../pixels';
import Ellipsis from './Ellipsis';

const borderWidth = 1;
const containerStyles = css({
  display: 'flex',
  cursor: 'default',
  justifyContent: 'center',
  alignItems: 'center',
});

const styles = css({
  padding: `${rem(5)} ${rem(15)} ${rem(5)}`,

  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',

  backgroundColor: colour.neutral[0],
  borderStyle: 'solid',
  borderWidth: `${borderWidth}px`,
  borderColor: neutral500.rgb,
  borderRadius: rem(18),
});

const highlightStyles = css({
  backgroundColor: success100.rgb,
});

const hoverStyles = ({
  primary100 = success100,
  primary900 = colorFromHex(colour.brand.crn[800]),
}: Theme['colors'] = {}) =>
  css({
    ':hover': {
      backgroundColor: primary100.rgba,
      borderColor: primary900.rgba,
      color: primary900.rgba,
    },
  });

const disabledStyles = css({
  backgroundColor: neutral300.rgb,
  borderColor: neutral500.rgb,
  color: neutral1000.rgb,
});

const iconStyles = css({
  display: 'flex',
  marginLeft: rem(8),
  padding: 0,
  border: 'none',
  backgroundColor: 'unset',
  svg: {
    fill: neutral900.rgba,
  },
  cursor: 'pointer',
});

const iconDisabledStyles = css({
  cursor: 'not-allowed',
  svg: {
    fill: neutral1000.rgb,
  },
});

type TagProps = {
  readonly enabled?: boolean;
  readonly highlight?: boolean;
  readonly children?: React.ReactNode;
  readonly title?: string;
} & (RemoveTagProps | TagWithHrefProps);

type RemoveTagProps = {
  readonly onRemove: () => void;
  readonly href?: undefined;
};
type TagWithHrefProps = {
  readonly href?: string;
  readonly onRemove?: undefined;
};

const ConditionalLinkWrapper: React.FC<{
  href?: string;
  children: React.ReactNode;
}> = ({ href, children }) => (
  <>
    {href ? (
      <a href={href} style={{ color: charcoal.rgb, textDecoration: 'inherit' }}>
        {children}
      </a>
    ) : (
      children
    )}
  </>
);

const Tag: React.FC<TagProps> = ({
  children,
  highlight = false,
  enabled = true,
  href,
  onRemove,
  title,
}) => (
  <div css={containerStyles} title={title}>
    <ConditionalLinkWrapper href={enabled ? href : undefined}>
      <div
        css={({ colors }) => [
          styles,
          ...(enabled
            ? [highlight && highlightStyles, !!href && hoverStyles(colors)]
            : [disabledStyles]),
        ]}
      >
        <Ellipsis>{children}</Ellipsis>
        {!!onRemove && (
          <button
            type="button"
            css={[iconStyles, !enabled && iconDisabledStyles]}
            disabled={!enabled}
            onClick={onRemove}
          >
            {crossSmallIcon}
          </button>
        )}
      </div>
    </ConditionalLinkWrapper>
  </div>
);

export default Tag;
