import { ComponentProps, useState } from 'react';
import { css } from '@emotion/react';

import { Label, TextField, Paragraph, Link, Button } from '../atoms';
import { rem } from '../pixels';
import { showPasswordIcon, hidePasswordIcon } from '../icons';
import { colour } from '../colors';

const forgotPasswordStyles = css({
  paddingTop: rem(6),
});

const showPasswordIndicatorStyles = (isInvalid: boolean) =>
  css({
    display: 'flex',
    height: '100%',
    // because our indicator is just text,
    // move it down from the center to align with the field text that is also below center
    paddingTop: rem(1),

    fill: isInvalid ? colour.foreground.error : colour.brand.crn[500],
  });

type LabeledPasswordFieldProps = {
  readonly title?: React.ReactNode;

  readonly forgotPasswordHref?: string;
} & Pick<
  ComponentProps<typeof TextField>,
  'value' | 'onChange' | 'required' | 'placeholder' | 'customValidationMessage'
>;
const LabeledPasswordField: React.FC<LabeledPasswordFieldProps> = ({
  title = 'Password',

  forgotPasswordHref,

  value,
  customValidationMessage,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);
  const isInvalid = !!(customValidationMessage && touched);

  return (
    <div>
      <Label
        forContent={(id) => (
          <TextField
            {...props}
            id={id}
            value={value}
            customValidationMessage={customValidationMessage}
            onBlur={() => setTouched(true)}
            type={showPassword ? 'text' : 'password'}
            rightIndicator={
              value ? (
                <div css={showPasswordIndicatorStyles(isInvalid)}>
                  <Button
                    linkStyle
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? hidePasswordIcon : showPasswordIcon}
                  </Button>
                </div>
              ) : undefined
            }
          />
        )}
      >
        <Paragraph noMargin styles={css({ paddingBottom: rem(16) })}>
          <strong>{title}</strong>
        </Paragraph>
      </Label>
      {forgotPasswordHref && (
        <div css={forgotPasswordStyles}>
          <Link href={forgotPasswordHref}>Forgot Password?</Link>
        </div>
      )}
    </div>
  );
};

export default LabeledPasswordField;
