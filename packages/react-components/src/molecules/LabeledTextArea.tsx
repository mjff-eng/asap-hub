import { ComponentProps } from 'react';
import { css } from '@emotion/react';

import { rem } from '../pixels';
import { Label, Paragraph, TextArea } from '../atoms';
import { colour } from '../colors';
import { TooltipInfo } from '.';

const tipStyles = css({
  marginTop: 0,
  ':empty': {
    display: 'none',
  },
  paddingTop: 0,

  color: colour.foreground.tertiary,
});

const subtitleStyles = css({
  paddingLeft: rem(6),
});

type LabeledTextAreaProps = {
  readonly title: React.ReactNode;
  readonly subtitle?: React.ReactNode;
  readonly tip?: React.ReactNode;
  readonly info?: React.ReactNode;
} & Exclude<ComponentProps<typeof TextArea>, 'id'>;

const infoStyle = css({
  [`p:first-of-type`]: {
    marginBottom: rem(8),
  },
  [`p:not(:first-of-type)`]: {
    marginBottom: rem(2),
  },
  [`& p`]: {
    textAlign: 'left',
    color: colour.neutral[0],
    marginTop: 0,
  },
});

const infoWrapperStyle = css({
  paddingLeft: rem(16),
  lineHeight: 0,
  [`span, button`]: {
    lineHeight: 0,
  },
});

const LabeledTextArea: React.FC<LabeledTextAreaProps> = ({
  title,
  subtitle,
  tip,
  info,
  ...textAreaProps
}) => (
  <div>
    <Label forContent={(id) => <TextArea {...textAreaProps} id={id} />}>
      <Paragraph noMargin styles={css({ paddingBottom: rem(16) })}>
        <span css={{ display: 'flex', marginBottom: 0 }}>
          <strong>{title}</strong>
          <span css={subtitleStyles}>{subtitle}</span>
          {info ? (
            <TooltipInfo
              overrideWrapperStyles={infoWrapperStyle}
              overrideTooltipStyles={infoStyle}
            >
              {info}
            </TooltipInfo>
          ) : null}
        </span>
        <span css={tipStyles}>{tip}</span>
      </Paragraph>
    </Label>
  </div>
);

export default LabeledTextArea;
