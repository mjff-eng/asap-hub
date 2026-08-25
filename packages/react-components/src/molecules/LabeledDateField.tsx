import { css } from '@emotion/react';
import { format, parseISO } from 'date-fns';
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
  readonly value?: Date;
  readonly max?: Date;
  readonly onChange?: (newDate: Date | undefined) => void;
} & Pick<
  ComponentProps<typeof TextField>,
  'required' | 'customValidationMessage' | 'getValidationMessage' | 'onBlur'
>;

const subtitleStyles = css({
  paddingLeft: `${rem(6)}`,
});

const descriptionStyles = css({
  color: neutral900.rgb,
});

// The value is a date-only field stored at UTC midnight; format it in UTC so the
// calendar day does not shift for viewers in timezones behind UTC.
export const parseDateToString = (date?: Date): string => {
  try {
    if (date) {
      return date.toISOString().slice(0, 10);
    }
    throw new Error('Date is undefined');
  } catch {
    return '';
  }
};

const LabeledDateField: React.FC<LabeledDateFieldProps> = ({
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
          value={parseDateToString(value)}
          onChange={(newDate) => {
            onChange(
              newDate ? parseISO(`${newDate}T00:00:00.000Z`) : undefined,
            );
          }}
          // max is a "today" selection ceiling that the user reasons about in their
          // local calendar, so it stays in local time (unlike the UTC-anchored value).
          max={max ? format(max, 'yyyy-MM-dd') : undefined}
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
export default LabeledDateField;
