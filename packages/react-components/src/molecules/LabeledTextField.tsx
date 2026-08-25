import { css, SerializedStyles } from '@emotion/react';
import { ComponentProps } from 'react';
import { Label, Paragraph, TextField } from '../atoms';
import { neutral900 } from '../colors';
import { rem } from '../pixels';

const descriptionStyles = css({
  color: neutral900.rgb,
});

const hintStyles = css({
  ':empty': {
    display: 'none',
  },
  paddingTop: rem(6),

  color: neutral900.rgb,
});

type LabeledTextFieldProps = {
  readonly title: React.ReactNode;
  readonly subtitle?: React.ReactNode;
  readonly description?: React.ReactNode;
  readonly hint?: React.ReactNode;
  readonly overrideStyles?: SerializedStyles;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
} & Exclude<ComponentProps<typeof TextField>, 'id'>;

const subtitleStyles = css({
  paddingLeft: rem(6),
});

const LabeledTextField: React.FC<LabeledTextFieldProps> = ({
  title,
  subtitle,
  description,
  hint,
  overrideStyles,
  ...textFieldProps
}) => (
  <div>
    <Label forContent={(id) => <TextField {...textFieldProps} id={id} />}>
      <Paragraph noMargin styles={css({ paddingBottom: rem(16) })}>
        <strong>{title}</strong>
        <span css={subtitleStyles}>{subtitle}</span>
        <br />
        <span css={[descriptionStyles]}>{description}</span>
      </Paragraph>
    </Label>
    <div css={hintStyles}>{hint}</div>
  </div>
);

export default LabeledTextField;
