import { css, Theme } from '@emotion/react';
import { colour, colorFromHex } from '../colors';
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
  borderColor: colour.border.tertiary,
  borderRadius: rem(18),
});

const highlightStyles = css({
  backgroundColor: colour.background.brand,
});

const hoverStyles = ({
  primary900 = colorFromHex(colour.brand.crn[800]),
}: Theme['colors'] = {}) =>
  css({
    ':hover': {
      backgroundColor: colour.background['hover-brand'],
      borderColor: primary900.rgba,
      color: primary900.rgba,
    },
  });

const disabledStyles = css({
  backgroundColor: colour.background.tertiary,
  borderColor: colour.border.tertiary,
  color: colour.foreground.primary,
});

const iconStyles = css({
  display: 'flex',
  marginLeft: rem(8),
  padding: 0,
  border: 'none',
  backgroundColor: 'unset',
  svg: {
    fill: colour.foreground.tertiary,
  },
  cursor: 'pointer',
});

const iconDisabledStyles = css({
  cursor: 'not-allowed',
  svg: {
    fill: colour.foreground.primary,
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
      <a
        href={href}
        style={{ color: colour.foreground.primary, textDecoration: 'inherit' }}
      >
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
