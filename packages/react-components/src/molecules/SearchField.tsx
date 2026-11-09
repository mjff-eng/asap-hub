import { css } from '@emotion/react';
import { ComponentProps, useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';
import {
  SEARCH_EVENT,
  SEARCH_PLACEHOLDER_KEY,
  SEARCH_QUERY_KEY,
} from '../analytics';
import { Button, TextField } from '../atoms';
import { crossIcon, searchIcon } from '../icons';

const clearButtonStyles = css({
  // removing input's clear/cancel pseudo-element
  // from webkit based browsers
  'input[type="search"]::-webkit-search-cancel-button': {
    appearance: 'none',
  },
  // and from IE
  'input[type=text]::-ms-clear': { display: 'none', width: 0, height: 0 },
});

const rightIndicatorStyles = css({
  button: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
const MAX_ALGOLIA_QUERY_LENGTH = 512;

type SearchProps = Pick<
  ComponentProps<typeof TextField>,
  'value' | 'onChange'
> &
  Required<Pick<ComponentProps<typeof TextField>, 'placeholder'>> & {
    padding?: boolean;
  };
const SearchField: React.FC<SearchProps> = ({
  padding = true,
  value,
  onChange,
  placeholder,
}) => {
  const [typedValue, setTypedValue] = useState<string | null>(null);
  const inputValue = typedValue ?? value;

  const handleChange = (newValue: string) => {
    setTypedValue(newValue);
    onChange?.(newValue);
  };

  const handleClear = () => {
    setTypedValue(null);
    onChange?.('');
  };

  const [debouncedValue] = useDebounce(value, 5000);

  useEffect(() => {
    if (value && value === debouncedValue) {
      window.dataLayer?.push({
        [SEARCH_QUERY_KEY]: value,
        [SEARCH_PLACEHOLDER_KEY]: placeholder,
        event: SEARCH_EVENT,
      });
    }

    return () => {
      window.dataLayer?.push({
        [SEARCH_QUERY_KEY]: undefined,
        [SEARCH_PLACEHOLDER_KEY]: undefined,
      });
    };
  }, [debouncedValue, placeholder, value]);

  return (
    <div css={[clearButtonStyles, !padding && { padding: 0 }]}>
      <TextField
        value={inputValue}
        onChange={handleChange}
        onBlur={() => setTypedValue(null)}
        placeholder={placeholder}
        maxLength={MAX_ALGOLIA_QUERY_LENGTH}
        type="search"
        leftIndicator={searchIcon}
        rightIndicator={
          inputValue ? (
            <div css={rightIndicatorStyles}>
              <Button linkStyle onClick={handleClear}>
                {crossIcon}
              </Button>
            </div>
          ) : undefined
        }
      />
    </div>
  );
};

export default SearchField;
