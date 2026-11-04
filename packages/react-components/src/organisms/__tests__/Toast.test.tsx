import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Toast, { ToastAccents } from '../Toast';
import { noop } from '../../utils';

it('renders the children and default icon', () => {
  const { getByText, getByTitle } = render(<Toast>error message</Toast>);
  expect(getByText('error message')).toBeVisible();
  expect(getByTitle('Error Icon')).toBeInTheDocument();
});

it('renders a custom icon in place of the accent icon', () => {
  const { getByTitle, queryByTitle } = render(
    <Toast
      accent="warning"
      icon={
        <svg>
          <title>Custom</title>
        </svg>
      }
    >
      Text
    </Toast>,
  );
  expect(getByTitle('Custom')).toBeInTheDocument();
  expect(queryByTitle('Warning')).not.toBeInTheDocument();
});

it('does not render a close button by default', () => {
  const { queryByText } = render(<Toast>error message</Toast>);
  expect(queryByText(/close/i)).not.toBeInTheDocument();
});
describe('when closable', () => {
  it('renders a close button', () => {
    const { getByTitle } = render(<Toast onClose={noop}>error message</Toast>);
    expect(getByTitle(/close/i)).toBeInTheDocument();
  });

  it('emits close events', async () => {
    const handleClose = jest.fn();
    const { getByTitle } = render(
      <Toast onClose={handleClose}>error message</Toast>,
    );

    await userEvent.click(getByTitle(/close/i));
    expect(handleClose).toHaveBeenCalled();
  });
});

it.each<{
  accent: ToastAccents;
  iconTitle: string;
}>([
  { accent: 'error', iconTitle: 'Error Icon' },
  { accent: 'info', iconTitle: 'Information' },
  { accent: 'warning', iconTitle: 'Warning' },
  { accent: 'success', iconTitle: 'Success' },
  { accent: 'successLarge', iconTitle: 'Success Large' },
])(
  'render the $iconTitle icon for Toast accent $accent',
  ({ accent, iconTitle }) => {
    const { getByTitle } = render(<Toast accent={accent}>Text</Toast>);
    expect(getByTitle(iconTitle)).toBeInTheDocument();
  },
);
