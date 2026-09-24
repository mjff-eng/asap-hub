import { css } from '@emotion/react';
import { FC, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import Select, {
  ControlProps,
  SingleValueProps,
  GroupBase,
  OptionProps,
  components,
} from 'react-select';
import { useValidation, validationMessageStyles } from '../form';
import { dropdownChevronIcon, dropdownCrossIcon } from '../icons';
import { Option, reactSelectStyles } from '../select';
import { noop } from '../utils';

export const ENTER_KEYCODE = 13;
const containerStyles = css({
  flexBasis: '100%',
});

const singleValueStyles = css({
  gridArea: '1 / 1 / 2 / 3',
  display: 'flex',
  alignItems: 'center',
  pointerEvents: 'none',
  overflow: 'hidden',
});

function CustomSingleValue<V extends string>({
  data,
  renderValue,
  ...props
}: SingleValueProps<Option<V>, false, GroupBase<Option<V>>> & {
  renderValue?: (value: V) => React.ReactNode;
}) {
  return (
    <div {...props.innerProps} css={singleValueStyles}>
      {renderValue ? renderValue(data.value) : data.label}
    </div>
  );
}

function CustomOption<V extends string>({
  renderOption,
  ...props
}: OptionProps<Option<V>, false> & {
  renderOption?: (option: Option<V>) => ReactNode;
}) {
  return (
    <components.Option {...props}>
      {renderOption ? renderOption(props.data) : props.data.label}
    </components.Option>
  );
}

const DropdownIndicator: FC = () => dropdownChevronIcon;
const CrossIcon: FC = () => dropdownCrossIcon;
const ClearIndicator = <V extends string>({
  innerProps,
}: Pick<
  ControlProps<Option<V>, false, GroupBase<Option<V>>>,
  'innerProps'
>) => (
  <span {...innerProps}>
    <CrossIcon />
  </span>
);
export interface DropdownProps<V extends string> {
  readonly customValidationMessage?: string;
  readonly getValidationMessage?: Parameters<typeof useValidation>[1];

  readonly id?: string;
  readonly options: ReadonlyArray<Option<V>>;
  readonly enabled?: boolean;
  readonly required?: boolean;
  readonly placeholder?: string;
  readonly name?: string;

  readonly value: V;
  readonly renderValue?: (value: V) => ReactNode;
  readonly renderOption?: (option: Option<V>) => ReactNode;
  readonly onChange?: (newValue: V) => void;
  readonly onBlur?: () => void;
  readonly onMenuOpen?: () => void;
  readonly onMenuClose?: () => void;
  readonly noOptionsMessage?: (value: { inputValue: string }) => string | null;
}
export default function Dropdown<V extends string>({
  customValidationMessage = '',
  getValidationMessage,
  id,
  options,
  enabled = true,
  required = false,
  placeholder = 'Start Typing...',
  name,

  value,
  renderValue,
  renderOption,
  onChange = noop,
  onBlur = noop,
  onMenuOpen = noop,
  onMenuClose = noop,
  noOptionsMessage,
}: DropdownProps<V>): ReturnType<FC> {
  const { validationMessage, validationTargetProps, validate } =
    useValidation<HTMLInputElement>(
      customValidationMessage,
      getValidationMessage,
    );

  const [hasBlurred, setHasBlurred] = useState(false);
  const previousValue = useRef(value);
  const previousRequired = useRef(required);

  // Validate when value or required changes AFTER user has interacted (blurred)
  useEffect(() => {
    if (
      hasBlurred &&
      (previousValue.current !== value || previousRequired.current !== required)
    ) {
      validate();
    }
    previousValue.current = value;
    previousRequired.current = required;
  }, [value, hasBlurred, validate, required]);

  const validOptions = useMemo(
    () => options.filter((option) => option.value !== ''),
    [options],
  );
  const selectValue = validOptions.find((option) => option.value === value);
  return (
    <div css={containerStyles}>
      <Select<Option<V>, false, GroupBase<Option<V>>>
        placeholder={placeholder}
        inputId={id}
        isClearable={!required}
        isDisabled={!enabled}
        options={validOptions as Option<V>[]}
        onChange={(option) => {
          onChange(option?.value as V);
        }}
        value={selectValue || null}
        components={{
          DropdownIndicator,
          ClearIndicator,
          SingleValue: (props) => (
            <CustomSingleValue {...props} renderValue={renderValue} />
          ),
          Option: (props) => (
            <CustomOption {...props} renderOption={renderOption} />
          ),
        }}
        styles={reactSelectStyles(!!validationMessage)}
        noOptionsMessage={noOptionsMessage}
        tabSelectsValue={false}
        onBlur={() => {
          setHasBlurred(true);
          validate();
          onBlur();
        }}
        onMenuClose={onMenuClose}
        onMenuOpen={onMenuOpen}
        aria-label={name}
      />
      <input
        {...validationTargetProps}
        tabIndex={-1}
        autoComplete="off"
        value={value}
        required={required}
        disabled={!enabled}
        hidden={true}
        onChange={noop}
        onBlur={noop}
      />

      <div css={validationMessageStyles}>{validationMessage}</div>
    </div>
  );
}
