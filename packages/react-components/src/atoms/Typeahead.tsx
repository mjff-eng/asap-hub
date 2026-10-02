import { css } from '@emotion/react';
import { createContext, createRef, FC, useContext, useState } from 'react';
import {
  components,
  InputActionMeta,
  GroupBase,
  InputProps,
} from 'react-select';
import AsyncCreatable from 'react-select/async-creatable';
import Creatable from 'react-select/creatable';
import { useValidation, validationMessageStyles } from '../form';
import { dropdownChevronIcon } from '../icons';
import { loadingImage } from '../images';
import { rem } from '../pixels';
import { reactSelectStyles } from '../select';
import { noop } from '../utils';

interface TypeaheadOption {
  value: string;
  label: string;
}

const containerStyles = css({
  flexBasis: '100%',
});

const DropdownIndicator: FC = () => dropdownChevronIcon;
const LoadingIndicator: FC = () => (
  <div
    css={{
      display: 'flex',
      width: rem(24),
      height: rem(24),
      backgroundImage: `url(${loadingImage})`,
      backgroundSize: 'cover',
    }}
  />
);

const InputContext = createContext<
  ReturnType<typeof useValidation>['validationTargetProps'] &
    Pick<TypeaheadProps, 'required' | 'maxLength'>
>({
  ref: createRef(),
  onBlur: noop,
  onInvalid: noop,
});
const Input = (
  props: InputProps<TypeaheadOption, false, GroupBase<TypeaheadOption>>,
) => {
  const { ref, onBlur, ...inputProps } = useContext(InputContext);
  return (
    <components.Input
      {...props}
      {...inputProps}
      isHidden={false}
      onBlur={(event: React.FocusEvent<HTMLInputElement>) => {
        props.onBlur?.(event);
        onBlur(event);
      }}
      autoComplete="off"
      innerRef={(element) => {
        ref.current = element;
        props.innerRef?.(element);
      }}
    />
  );
};

type TypeaheadProps = {
  readonly customValidationMessage?: string;
  readonly getValidationMessage?: Parameters<typeof useValidation>[1];

  readonly id?: string;
  readonly enabled?: boolean;

  readonly required?: boolean;
  readonly maxLength?: number;

  readonly value: string;
  readonly onChange?: (newValue: string) => void;
} & (
  | {
      readonly suggestions: ReadonlyArray<string>;
      readonly loadOptions?: never;
    }
  | {
      readonly suggestions?: never;
      readonly loadOptions: (newValue?: string) => Promise<string[]>;
    }
);

const Typeahead: FC<TypeaheadProps> = ({
  customValidationMessage = '',
  getValidationMessage,

  id,
  enabled = true,
  required = false,
  maxLength,

  value,
  onChange = noop,
  ...rest
}) => {
  const [inputValue, setInputValue] = useState(value);

  const { validationMessage, validationTargetProps } =
    useValidation<HTMLInputElement>(
      customValidationMessage,
      getValidationMessage,
    );
  const onNewValue = (newValue: string) => {
    setInputValue(newValue);
    onChange(newValue);
    // Hack to re-validate once the selected value has been put in the state of the input field
    setTimeout(validationTargetProps.onBlur, 0);
  };

  const commonProps = {
    inputId: id,
    isDisabled: !enabled,
    value: { value, label: value },
    inputValue,
    loading: true,
    placeholder: 'Start Typing…',
    noOptionsMessage: () => null,
    tabSelectsValue: false,
    controlShouldRenderValue: false,
    components: {
      DropdownIndicator,
      Input: Input as typeof components.Input,
      LoadingIndicator,
    },
    styles: reactSelectStyles(!!validationMessage),
    onChange: (option: TypeaheadOption | null) => {
      const newValue = option?.value || '';
      onNewValue(newValue);
    },
    onInputChange: (newInputValue: string, { action }: InputActionMeta) => {
      switch (action) {
        case 'input-change':
          onNewValue(newInputValue);
          break;
      }
    },
  };
  return (
    <div css={containerStyles}>
      <InputContext.Provider
        value={{ ...validationTargetProps, required, maxLength }}
      >
        {rest.suggestions ? (
          <Creatable<TypeaheadOption, false, GroupBase<TypeaheadOption>>
            {...commonProps}
            options={rest.suggestions.map((suggestion) => ({
              value: suggestion,
              label: suggestion,
            }))}
          />
        ) : (
          <AsyncCreatable<TypeaheadOption, false, GroupBase<TypeaheadOption>>
            {...commonProps}
            defaultOptions
            cacheOptions
            loadingMessage={() => null}
            isValidNewOption={() => false}
            loadOptions={async (newValue) =>
              (await rest.loadOptions(newValue)).map((suggestion) => ({
                label: suggestion,
                value: suggestion,
              }))
            }
          />
        )}
      </InputContext.Provider>
      <div css={validationMessageStyles}>{validationMessage}</div>
    </div>
  );
};

export default Typeahead;
