import { render } from '@testing-library/react';

import ToastCard from '../ToastCard';
import { colour } from '../../colors';

it('renders a toast card with children', () => {
  const { getByText } = render(<ToastCard>content</ToastCard>);
  expect(getByText('content')).toBeVisible();
});

it('does not render a toast when no message is provided', () => {
  const { queryByTitle } = render(<ToastCard>content</ToastCard>);
  expect(queryByTitle('Alert')).not.toBeInTheDocument();
});

it('renders a toast card with paper clip icon', () => {
  const { getByTitle, getByText } = render(
    <ToastCard type="attachment" toastContent="explanation text">
      content
    </ToastCard>,
  );
  expect(getByTitle(/paper ?clip/i)).toBeInTheDocument();
  expect(getByText('explanation text')).toBeVisible();
});

it('renders a toast card with warning icon', () => {
  const { getByTitle, getByText } = render(
    <ToastCard type="alert" toastContent="explanation text">
      content
    </ToastCard>,
  );
  expect(getByTitle(/warning/i)).toBeInTheDocument();
  expect(getByText('explanation text')).toBeVisible();
});

it('renders a toast card with live icon', () => {
  const { getByTitle, getByText } = render(
    <ToastCard type="live" toastContent="explanation text">
      content
    </ToastCard>,
  );
  expect(getByTitle(/live/i)).toBeInTheDocument();
  expect(getByText('explanation text')).toBeVisible();
});

it('renders the live icon in red', () => {
  const { getByTitle } = render(
    <ToastCard type="live" toastContent="explanation text">
      content
    </ToastCard>,
  );
  expect(
    getByTitle(/live/i).parentElement!.querySelector('circle'),
  ).toHaveAttribute('fill', colour.utilitarian.red[600]);
});

it('renders an upcoming toast card without an icon', () => {
  const { container, getByText } = render(
    <ToastCard type="upcoming" toastContent="explanation text">
      content
    </ToastCard>,
  );
  expect(getByText('explanation text')).toBeVisible();
  expect(container.querySelector('svg')).not.toBeInTheDocument();
});

it('renders a toast card with info icon', () => {
  const { getByTitle, getByText } = render(
    <ToastCard type="info" toastContent="explanation text">
      content
    </ToastCard>,
  );
  expect(getByTitle(/info/i)).toBeInTheDocument();
  expect(getByText('explanation text')).toBeVisible();
});

it('does not renders a toast card when no toast content provided', () => {
  const { queryByTitle } = render(
    <ToastCard type="attachment">content</ToastCard>,
  );
  expect(queryByTitle(/paper ?clip/i)).not.toBeInTheDocument();
});
