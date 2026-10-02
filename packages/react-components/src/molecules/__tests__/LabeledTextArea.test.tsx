import { render } from '@testing-library/react';

import LabeledTextArea from '../LabeledTextArea';
import { colour } from '../../colors';

it('renders a labeled text area, passing through props', () => {
  const { getByRole, getByLabelText } = render(
    <LabeledTextArea title="Title" subtitle="Optional" value="val" />,
  );

  expect(getByLabelText(/Title/i)).toBeVisible();
  expect(getByLabelText(/Optional/i)).toBeVisible();
  expect(getByRole('textbox')).toHaveValue('val');
});

it('renders a greyed out tip', () => {
  const { getByText } = render(
    <LabeledTextArea title="Title" tip="Tip" value="val" />,
  );
  expect(getByText('Tip')).toHaveStyleRule('color', colour.foreground.tertiary);
});
