import { MemoryRouter, Route, Routes } from 'react-router';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { findParentWithStyle } from '@asap-hub/dom-test-utils';
import { colour } from '../../colors';

import Header from '../Header';

it('renders an CRN logo', () => {
  const { getByTitle } = render(<Header />);
  expect(getByTitle('CRN Logo')).toBeInTheDocument();
});

it('links back to the home page', async () => {
  const { getByTitle, container } = render(
    <MemoryRouter initialEntries={['/page']}>
      <Routes>
        <Route path="/page" element={<Header />} />
        <Route path="/" element={<>home</>} />
      </Routes>
    </MemoryRouter>,
  );

  await userEvent.click(getByTitle('CRN Logo'));
  expect(container).toHaveTextContent('home');
});

it('does not render an opaque background when set to transparent', () => {
  const { getByTitle, rerender } = render(<Header />);
  expect(getByTitle('CRN Logo').closest('header')).toHaveStyleRule(
    'background-color',
    colour.background.primary,
  );

  rerender(<Header transparent />);
  expect(findParentWithStyle(getByTitle('CRN Logo'), 'backgroundColor')).toBe(
    null,
  );
});

it('enables the header link when user is onboarded', () => {
  const { container, rerender } = render(<Header enabled={true} />);
  expect(container.querySelector('a')).toHaveAttribute('href', '/');

  rerender(<Header enabled={false} />);
  expect(container.querySelector('a')).not.toHaveAttribute('href', '');
});
