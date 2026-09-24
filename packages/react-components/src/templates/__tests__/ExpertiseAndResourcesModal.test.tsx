import { ComponentProps } from 'react';
import { render, act, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { createUserResponse } from '@asap-hub/fixtures';
import { findParentWithStyle } from '@asap-hub/dom-test-utils';

import ExpertiseAndResourcesModal from '../ExpertiseAndResourcesModal';
import { colour, colorFromHex } from '../../colors';

const mapTags = (tags: string[]) => tags.map((tag) => ({ name: tag, id: tag }));

const props: ComponentProps<typeof ExpertiseAndResourcesModal> = {
  ...createUserResponse(),
  suggestions: [],
  backHref: '/wrong',
};

const renderModal = (children: React.ReactNode) =>
  render(<MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>);
it('renders the title', () => {
  const { getByText } = renderModal(<ExpertiseAndResourcesModal {...props} />);
  expect(
    getByText('Expertise, Resources and Tags', { selector: 'h3' }),
  ).toBeVisible();
});

it('indicates which fields are required or optional', () => {
  const { getByText } = renderModal(<ExpertiseAndResourcesModal {...props} />);

  [
    { title: 'Tags', subtitle: 'required' },
    { title: 'Expertise and Resources', subtitle: 'optional' },
  ].forEach(({ title, subtitle }) =>
    expect(getByText(title).nextSibling?.textContent).toContain(subtitle),
  );
});

it('renders default values into text inputs', () => {
  const { getByLabelText } = renderModal(
    <ExpertiseAndResourcesModal
      {...props}
      expertiseAndResourceDescription="example description"
    />,
  );
  expect(getByLabelText(/expertise and resources/i)).toHaveValue(
    'example description',
  );
});

it('triggers the save function', async () => {
  const handleSave = jest.fn();
  const { getByLabelText, getByText } = renderModal(
    <ExpertiseAndResourcesModal
      {...props}
      tags={mapTags(['1', '2', '3', '4'])}
      suggestions={mapTags(['1', '2', '3', '4', '5'])}
      onSave={handleSave}
    />,
  );

  await userEvent.type(
    getByLabelText(/expertise and resources/i),
    'example description',
  );

  await userEvent.type(getByLabelText(/tags\s*\(required\)/i), '5');
  await userEvent.tab();

  await userEvent.click(getByText('Save'));

  await waitFor(() =>
    expect(getByText(/save/i).closest('button')).toBeEnabled(),
  );
  expect(handleSave).toHaveBeenCalledWith({
    expertiseAndResourceDescription: 'example description',
    tagIds: ['1', '2', '3', '4', '5'],
  });
});

it('disables the form elements while submitting', async () => {
  let resolveSubmit!: () => void;
  const handleSave = () =>
    new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });
  const { getByText } = renderModal(
    <ExpertiseAndResourcesModal
      {...props}
      tags={mapTags(['1', '2', '3', '4', '5'])}
      onSave={handleSave}
    />,
  );

  await userEvent.click(getByText(/save/i));

  const form = getByText(/save/i).closest('form')!;
  expect(form.elements.length).toBeGreaterThan(1);
  [...form.elements].forEach((element) => expect(element).toBeDisabled());

  act(resolveSubmit);
  await waitFor(() =>
    expect(getByText(/save/i).closest('button')).toBeEnabled(),
  );
});

describe('tags selection', () => {
  it('displays a no options message', async () => {
    const { getByLabelText, getByText } = renderModal(
      <ExpertiseAndResourcesModal {...props} suggestions={mapTags(['abc'])} />,
    );

    await userEvent.type(getByLabelText(/tags\s*\(required\)/i), 'def');
    expect(getByText('Sorry, No current tags match "def"')).toBeVisible();
  });

  it('displays an error message when not enough tags have been selected on save', async () => {
    const handleSave = jest.fn();
    const { getByText, getByLabelText } = renderModal(
      <ExpertiseAndResourcesModal
        {...props}
        tags={mapTags(['1', '2', '3', '4'])}
        onSave={handleSave}
      />,
    );
    const input = getByLabelText(/tags\s*\(required\)/i);
    expect(
      findParentWithStyle(input, 'borderStyle')?.element,
    ).not.toHaveStyleRule('border-color', colour.utilitarian.red[600]);
    await userEvent.click(getByText(/save/i));
    expect(findParentWithStyle(input, 'borderStyle')?.element).toHaveStyleRule(
      'border-color',
      colour.border.tertiary,
    );
    expect(handleSave).not.toHaveBeenCalled();
  });

  it('removes error message when enough tags are selected', async () => {
    const handleSave = jest.fn();
    const { getByLabelText, getByText, queryByText } = renderModal(
      <ExpertiseAndResourcesModal
        {...props}
        tags={mapTags(['1', '2', '3'])}
        suggestions={mapTags(['1', '2', '3', '4', '5'])}
        onSave={handleSave}
      />,
    );

    const input = getByLabelText(/tags\s*\(required\)/i);
    await userEvent.click(input);
    await userEvent.type(input, '4');
    await userEvent.type(input, `{enter}`);
    fireEvent.blur(input);

    expect(
      colorFromHex(findParentWithStyle(input, 'borderColor')!.borderColor).rgb,
    ).toEqual(colorFromHex(colour.utilitarian.red[600]).rgb);
    expect(getByText('Please add a minimum of 5 tags')).toBeVisible();

    await userEvent.click(input);
    await userEvent.type(input, '5');
    await userEvent.type(input, `{enter}`);
    fireEvent.blur(input);

    expect(findParentWithStyle(input, 'borderStyle')?.element).toHaveStyleRule(
      'border-color',
      colour.border.tertiary,
    );
    expect(
      queryByText('Please add a minimum of 5 tags'),
    ).not.toBeInTheDocument();
  });
});
