import {
  FocusEventHandler,
  FormEvent,
  FormEventHandler,
  MutableRefObject,
  useEffect,
  useRef,
  useState,
} from 'react';
import { colour } from './colors';
import { lineHeight, rem } from './pixels';
import { themes } from './theme';

export const borderWidth = 1;

export const paddingLeftRight = 18;
export const paddingTopBottom = 15;
export const indicatorPadding = 8;

export const textPaddingTop = paddingTopBottom + 1;
export const textPaddingBottom = paddingTopBottom - 1;

export const indicatorSize = lineHeight;

export const styles = {
  ...themes.light,
  boxSizing: 'border-box',
  width: '100%',
  paddingLeft: rem(paddingLeftRight),
  paddingRight: rem(paddingLeftRight),
  paddingTop: rem(textPaddingTop),
  paddingBottom: rem(textPaddingBottom),

  lineHeight: rem(lineHeight),

  outline: 'none',

  borderStyle: 'solid',
  borderWidth: rem(borderWidth),
  borderColor: colour.border.tertiary,
  ':focus': {
    borderColor: colour.border.brand,
  },
} as const;

export const validationMessageStyles = {
  ':empty': {
    display: 'none',
  },
  whiteSpace: 'pre-wrap',
  paddingTop: rem(16),
  color: colour.foreground.error,
  borderColor: colour.border.error,
} as const;

type ValidationTarget =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement;
export function useValidation<T extends ValidationTarget>(
  customValidationMessage: string,
  getValidationMessage?: (validityState: ValidityState) => string | undefined,
  skipValidation: boolean = false,
): {
  validationMessage: string;
  validationTargetProps: {
    readonly onInvalid: FormEventHandler;
    readonly onBlur: FocusEventHandler;
    readonly ref: MutableRefObject<T | null>;
  };
  validate: () => void;
} {
  const inputRef = useRef<T>(null);
  const [validationMessage, setValidationMessage] = useState('');

  useEffect(() => {
    const input = inputRef.current;
    if (!input || skipValidation) return;

    // Normalize undefined to empty string to ensure setCustomValidity works correctly
    // (setCustomValidity(undefined) would convert to "undefined" string, keeping field invalid)
    const normalizedMessage = customValidationMessage || '';
    // Set the custom validity on the input element so browser knows about it
    input.setCustomValidity(normalizedMessage);
    // Update the validation message state when customValidationMessage changes
    // This handles both setting errors and clearing them when the field becomes valid
    setValidationMessage(normalizedMessage);

    // eslint-disable-next-line consistent-return
    return () => {
      if (!skipValidation) {
        input.setCustomValidity('');
      }
    };
  }, [customValidationMessage, skipValidation]);

  const validate = () => {
    if (inputRef.current && !skipValidation) {
      const inputField = inputRef.current;
      const inputFieldValidity = inputField.validity.valid;
      // Only NOW set the validation message state, which triggers display
      setValidationMessage(
        (getValidationMessage &&
          !inputFieldValidity &&
          getValidationMessage(inputField.validity)) ||
          inputField.validationMessage,
      );
    }
  };

  const handleBlur = (e: React.FocusEvent<ValidationTarget>) => {
    // Don't validate if blur is caused by clicking a button
    // This prevents validation errors when clicking cancel/action buttons
    if (e?.relatedTarget) {
      const relatedTarget = e.relatedTarget as HTMLElement | null;
      if (relatedTarget && relatedTarget.tagName === 'BUTTON') {
        return;
      }
    }
    validate();
  };

  return {
    validate,
    validationMessage,
    validationTargetProps: {
      ref: inputRef,
      onBlur: handleBlur,
      onInvalid: (event: FormEvent<ValidationTarget>) => {
        validate();
        event.preventDefault();
      },
    },
  };
}
