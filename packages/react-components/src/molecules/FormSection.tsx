import { css } from '@emotion/react';
import { Headline3, Subtitle, Paragraph } from '../atoms';
import { rem } from '../pixels';
import { themes } from '../theme';

export type FormSectionProps = {
  title?: string;
  secondaryTitle?: string;
  description?: string | React.ReactNode;
  headerDecorator?: React.ReactNode;
  children?: React.ReactNode;
};

const titleStyles = css({
  display: 'flex',
  flexFlow: 'row',
  gap: rem(10),
  alignItems: 'center',
  justifyContent: 'space-between',
});

const sectionStyles = css({
  padding: 0,
});

const descriptionWithTitleStyles = css({
  paddingTop: rem(24),
});

const descriptionBaseStyles = css({
  paddingBottom: 0,
});

const sectionChildrenWrapStyle = css({
  display: 'flex',
  flexFlow: 'column',
  gap: rem(48),
});

const sectionChildrenMarginWhenHasHeaderWrapStyle = css({
  marginTop: rem(32),
});

/**
 * A component for composing form layouts with consistent spacing and structure.
 *
 * Provides default spacing between child components  and optional title,
 * secondary title, description, and header decorator elements with proper spacing relationships.
 *
 * All props are optional, allowing flexible composition:
 * - Use with title, secondaryTitle, and description for full form sections
 * - Use with title and secondaryTitle for structured headings
 * - Use with only secondaryTitle for sub-section information
 * - Use with only description for contextual information
 * - Use with headerDecorator for action buttons (e.g., close, save)
 * - Use without any props for simple field grouping with consistent spacing
 *
 * The component has zero padding, so it can be wrapped in other containers
 * to control distance from borders as needed.
 */
const FormSection: React.FC<FormSectionProps> = ({
  children,
  title,
  secondaryTitle,
  description,
  headerDecorator,
}) => {
  const hasHeaderWrap = !!title || !!secondaryTitle || !!headerDecorator;
  return (
    <section aria-label={title} css={[themes.light, sectionStyles]}>
      {hasHeaderWrap && (
        <div role="presentation" css={[titleStyles]}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexFlow: 'column',
              gap: rem(12),
            }}
          >
            {!!title && <Headline3 noMargin>{title}</Headline3>}
            {!!secondaryTitle && (
              <Subtitle noMargin styleAsHeading={4}>
                {secondaryTitle}
              </Subtitle>
            )}
          </div>
          <div>{headerDecorator}</div>
        </div>
      )}
      {!!description && (
        <div
          css={css([
            descriptionBaseStyles,
            hasHeaderWrap && descriptionWithTitleStyles,
          ])}
        >
          <Paragraph noMargin accent="neutral900">
            {description}
          </Paragraph>
        </div>
      )}
      <div
        css={css([
          sectionChildrenWrapStyle,
          (hasHeaderWrap || !!description) &&
            sectionChildrenMarginWhenHasHeaderWrapStyle,
        ])}
      >
        {children}
      </div>
    </section>
  );
};

export default FormSection;
