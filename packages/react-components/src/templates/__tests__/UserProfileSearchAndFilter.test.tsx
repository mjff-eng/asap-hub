import { ComponentProps } from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import UserProfileSearchAndFilter from '../UserProfileSearchAndFilter';

const props: ComponentProps<typeof UserProfileSearchAndFilter> = {
  searchQuery: '',
  filters: new Set(),
  onChangeSearch: jest.fn(),
  onChangeFilter: jest.fn(),
};
it('renders the search box and filters button', () => {
  const { getByRole, getByText } = render(
    <UserProfileSearchAndFilter {...props} />,
  );
  expect(getByRole('searchbox')).toBeVisible();
  expect(getByText('Filters').closest('button')).toBeVisible();
});

it('calls the onChangeQuery when search input changes', async () => {
  const { getByRole } = render(<UserProfileSearchAndFilter {...props} />);
  await userEvent.type(getByRole('searchbox'), 'searchterm');
  [...'searchterm'].forEach((_, index) =>
    expect(props.onChangeSearch).toHaveBeenNthCalledWith(
      index + 1,
      'searchterm'.slice(0, index + 1),
    ),
  );
});
it('calls the onChangeFilter when filter is selected', async () => {
  const { getByText, getByLabelText } = render(
    <UserProfileSearchAndFilter {...props} />,
  );
  await userEvent.click(getByText('Filters'));
  await userEvent.click(getByLabelText('Grant Document'));

  expect(props.onChangeFilter).toHaveBeenCalledWith(
    'Grant Document',
    'documentType',
  );
});
