import { ComponentProps, ReactNode } from 'react';
import { render, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

import ConfirmModal from '../ConfirmModal';

const props: ComponentProps<typeof ConfirmModal> = {
  backHref: '/wrong',
  title: '',
};

const renderModal = (children: ReactNode) =>
  render(<MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>);

it('renders the title', () => {
  const { getByText } = renderModal(
    <ConfirmModal {...props} title="Ready to publish your profile?" />,
  );
  expect(
    getByText('Ready to publish your profile?', { selector: 'h3' }),
  ).toBeVisible();
});

it('renders the description when it is a string', () => {
  const { getByText } = renderModal(
    <ConfirmModal {...props} description="test description" />,
  );
  expect(getByText('test description', { selector: 'p' })).toBeVisible();
});

it('renders the description when it is a react node', () => {
  const { getByText } = renderModal(
    <ConfirmModal {...props} description={<span>test description</span>} />,
  );
  expect(getByText('test description', { selector: 'span' })).toBeVisible();
});

it('triggers the save function', async () => {
  const jestFn = jest.fn();
  const { getByText } = renderModal(
    <ConfirmModal
      {...props}
      confirmText="Publish and Explore"
      onSave={jestFn}
    />,
  );
  await userEvent.click(getByText(/Publish and Explore/i));

  expect(jestFn).toHaveBeenCalled();

  await waitFor(() =>
    expect(getByText(/Publish and Explore/i).closest('button')).toBeEnabled(),
  );
});

it('triggers the cancel function', async () => {
  const jestFn = jest.fn();
  const { getByText } = renderModal(
    <ConfirmModal
      {...props}
      backHref={undefined}
      cancelText="Cancel"
      onCancel={jestFn}
    />,
  );
  const cancel = getByText(/Cancel/i);
  await userEvent.click(cancel);

  expect(jestFn).toHaveBeenCalled();
});

it('disables publish & back while submitting', async () => {
  let resolveSubmit!: () => void;
  const handleSave = () =>
    new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });
  const { getByText } = renderModal(
    <ConfirmModal
      {...props}
      confirmText="Publish and Explore"
      cancelText="back"
      onSave={handleSave}
    />,
  );

  await userEvent.click(getByText(/Publish and Explore/i));
  expect(getByText(/Publish and Explore/i).closest('button')).toBeDisabled();
  expect(getByText(/back/i).closest('a')).not.toHaveAttribute('href');

  act(resolveSubmit);
  await waitFor(() =>
    expect(getByText(/Publish and Explore/i).closest('button')).toBeEnabled(),
  );
});

it('displays error message when save fails', async () => {
  let rejectSubmit!: () => void;
  const handleSave = () =>
    new Promise<void>((_, reject) => {
      rejectSubmit = reject;
    });
  const { getByText, findByText } = renderModal(
    <ConfirmModal
      {...props}
      confirmText="Publish and Explore"
      error="There has been an error publishing"
      onSave={handleSave}
    />,
  );

  await userEvent.click(getByText(/Publish and Explore/i));
  act(rejectSubmit);

  const errorMsg = await findByText(/error.+publish/i);
  expect(errorMsg).toBeVisible();
  await waitFor(() =>
    expect(getByText(/Publish and Explore/i).closest('button')).toBeEnabled(),
  );
});

it('shows the close button by default', () => {
  const { getByTitle } = renderModal(
    <ConfirmModal title="Discard changes?" onCancel={jest.fn()} />,
  );
  expect(getByTitle('Close')).toBeInTheDocument();
});

it('hides the close button when hideClose is set', () => {
  const { queryByTitle, getByRole } = renderModal(
    <ConfirmModal title="Discard changes?" onCancel={jest.fn()} hideClose />,
  );
  expect(queryByTitle('Close')).not.toBeInTheDocument();
  expect(getByRole('button', { name: 'Cancel' })).toBeVisible();
});
