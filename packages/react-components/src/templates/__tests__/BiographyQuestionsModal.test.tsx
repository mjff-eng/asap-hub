import { ComponentProps } from 'react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

import BiographyQuestionsModal from '../BiographyQuestionsModal';

const props: ComponentProps<typeof BiographyQuestionsModal> = {
  biography: 'My biography',
  questions: ['First question?', 'Second question?'],
  role: 'Grantee',
  backHref: '/back',
};

const renderModal = (
  overrides: Partial<ComponentProps<typeof BiographyQuestionsModal>> = {},
) =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <BiographyQuestionsModal {...props} {...overrides} />
    </MemoryRouter>,
  );

it('renders the biography and open questions fields with their values', () => {
  const { getByLabelText } = renderModal();
  expect(getByLabelText(/Biography Details/)).toHaveValue('My biography');
  expect(getByLabelText(/Open Question 1/)).toHaveValue('First question?');
  expect(getByLabelText(/Open Question 2/)).toHaveValue('Second question?');
  expect(getByLabelText(/Open Question 3/)).toHaveValue('');
  expect(getByLabelText(/Open Question 4/)).toHaveValue('');
});

it('renders which questions are mandatory/optional', () => {
  const { getByText } = renderModal();
  [
    { title: 'Open Question 1', subtitle: 'required' },
    { title: 'Open Question 2', subtitle: 'required' },
    { title: 'Open Question 3', subtitle: 'optional' },
    { title: 'Open Question 4', subtitle: 'optional' },
  ].forEach(({ title, subtitle }) =>
    expect(getByText(title).nextSibling?.textContent).toContain(subtitle),
  );
});

it('saves the biography and the non empty questions together', async () => {
  const onSave = jest.fn();
  const { getByLabelText, getByText } = renderModal({ onSave });

  await userEvent.type(getByLabelText(/Biography Details/), ' updated');
  await userEvent.type(getByLabelText(/Open Question 4/), 'Fourth?');
  await userEvent.click(getByText('Save'));

  await waitFor(() =>
    expect(onSave).toHaveBeenCalledWith({
      biography: 'My biography updated',
      questions: ['First question?', 'Second question?', 'Fourth?'],
    }),
  );
});

it('does not save when a required question is empty', async () => {
  const onSave = jest.fn();
  const { getByText } = renderModal({ onSave, questions: [] });

  await userEvent.click(getByText('Save'));

  await waitFor(() =>
    expect(getByText(/save/i).closest('button')).toBeEnabled(),
  );
  expect(onSave).not.toHaveBeenCalled();
});

describe('for staff', () => {
  it('does not render the open questions', () => {
    const { queryByLabelText } = renderModal({ role: 'Staff' });
    expect(queryByLabelText(/Open Question 1/)).not.toBeInTheDocument();
  });

  it('saves only the biography', async () => {
    const onSave = jest.fn();
    const { getByLabelText, getByText } = renderModal({
      onSave,
      role: 'Staff',
      questions: [],
    });

    await userEvent.type(getByLabelText(/Biography Details/), ' updated');
    await userEvent.click(getByText('Save'));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        biography: 'My biography updated',
      }),
    );
  });
});
