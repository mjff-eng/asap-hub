import { css, SerializedStyles } from '@emotion/react';
import { ComponentProps } from 'react';
import { Label, Paragraph, TextField } from '../atoms';
import { colour } from '../colors';
import { rem } from '../pixels';

const descriptionStyles = css({
  color: colour.foreground.tertiary,
});

const hintStyles = css({
  ':empty': {
    display: 'none',
  },
  paddingTop: rem(6),

  color: colour.foreground.tertiary,
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
