import { css } from '@emotion/react';
import { ComponentProps } from 'react';

import { Label, Paragraph, TextField } from '../atoms';
import { neutral900 } from '../colors';
import { rem } from '../pixels';
import { noop } from '../utils';

type LabeledDateFieldProps = {
  readonly title: React.ReactNode;
  readonly subtitle?: React.ReactNode;
  readonly description?: React.ReactNode;

  readonly enabled?: boolean;
  readonly value?: string;
  readonly max?: string;
  readonly onChange?: (newDate: string) => void;
} & Pick<
  ComponentProps<typeof TextField>,
  'required' | 'customValidationMessage' | 'getValidationMessage'
>;

const subtitleStyles = css({
  paddingLeft: `${rem(6)}`,
});

const descriptionStyles = css({
  color: neutral900.rgb,
});

const LabeledDateInput: React.FC<LabeledDateFieldProps> = ({
  title,
  subtitle,
  description,

  max,
  value,
  onChange = noop,
  ...dateFieldProps
}) => (
  <div>
    <Label
      forContent={(id) => (
        <TextField
          {...dateFieldProps}
          type="date"
          id={id}
          value={value ?? ''}
          onChange={onChange}
          max={max}
        />
      )}
    >
      <Paragraph noMargin styles={css({ paddingBottom: rem(16) })}>
        <strong>{title}</strong>
        <span css={subtitleStyles}>{subtitle}</span> <br />
        <span css={descriptionStyles}>{description}</span>
      </Paragraph>
    </Label>
  </div>
);
export default LabeledDateInput;
