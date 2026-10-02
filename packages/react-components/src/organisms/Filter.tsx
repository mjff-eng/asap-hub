import { useCallback, useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';

import { CheckboxGroup } from '.';
import { FILTERS_KEY, FILTER_EVENT, FILTER_TITLE_KEY } from '../analytics';
import { Option } from '../select';
import { noop } from '../utils';
import { Title } from './CheckboxGroup';
import FilterDropdown from './FilterDropdown';

export interface FilterProps<V extends string> {
  readonly filters?: Set<V>;
  readonly onChangeFilter?: (filter: V) => void;
  readonly filterOptions: ReadonlyArray<Option<V> | Title>;
  readonly buttonText?: string;
}
export default function Filter<V extends string>({
  filters = new Set(),
  onChangeFilter = noop,
  filterOptions,
  buttonText = 'Filters',
}: FilterProps<V>): ReturnType<React.FC> {
  const [menuShown, setMenuShown] = useState(false);
  const closeMenu = useCallback(() => setMenuShown(false), []);

  useEffect(() => {
    setMenuShown(false);
  }, [filterOptions]);

  const [debouncedFilters] = useDebounce(filters, 5000);
  useEffect(() => {
    if (filters.size && filters === debouncedFilters) {
      window.dataLayer?.push({
        [FILTERS_KEY]: [...filters],
        event: FILTER_EVENT,
      });
    }

    return () => {
      window.dataLayer?.push({
        [FILTERS_KEY]: undefined,
        [FILTER_TITLE_KEY]: undefined,
      });
    };
  }, [debouncedFilters, filters]);

  return (
    <FilterDropdown
      menuShown={menuShown}
      onToggle={() => setMenuShown(!menuShown)}
      onClose={closeMenu}
      buttonText={buttonText}
    >
      <CheckboxGroup<V>
        onChange={onChangeFilter}
        options={filterOptions}
        values={filters}
      />
    </FilterDropdown>
  );
}
