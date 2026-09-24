import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SpeakerSection from '../speaker-section';

const rows = (count: number) =>
  Array.from({ length: count }, (_row, index) => (
    <div key={index}>Row {index}</div>
  ));

const defaultProps = {
  variant: 'team' as const,
  rows: rows(3),
  expanded: false,
  onToggle: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

it('Should render nothing without rows', () => {
  const { container } = render(<SpeakerSection {...defaultProps} rows={[]} />);

  expect(container).toBeEmptyDOMElement();
});

it.each([
  ['team' as const, 'From Team Projects'],
  ['project' as const, 'From Individual Projects'],
  ['external' as const, 'External'],
])('Should title the %s section "%s"', (variant, title) => {
  render(<SpeakerSection {...defaultProps} variant={variant} />);

  expect(screen.getByRole('heading', { name: title })).toBeVisible();
});

it('Should show every row and no control at or below the cap', () => {
  render(<SpeakerSection {...defaultProps} rows={rows(5)} />);

  expect(screen.getByText('Row 4')).toBeVisible();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

it.each([
  ['team' as const, 'Show 2 more teams'],
  ['project' as const, 'Show 2 more projects'],
  ['external' as const, 'Show 2 more speakers'],
])('Should cap at five rows and count the rest as %ss', (variant, label) => {
  render(<SpeakerSection {...defaultProps} variant={variant} rows={rows(7)} />);

  expect(screen.getByText('Row 4')).toBeVisible();
  expect(screen.queryByText('Row 5')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: label })).toBeVisible();
});

it('Should singularise the count for one hidden row', () => {
  render(<SpeakerSection {...defaultProps} rows={rows(6)} />);

  expect(
    screen.getByRole('button', { name: 'Show 1 more team' }),
  ).toBeVisible();
});

it('Should show every row behind a Show less control once expanded', () => {
  render(<SpeakerSection {...defaultProps} rows={rows(7)} expanded />);

  expect(screen.getByText('Row 6')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Show less' })).toBeVisible();
});

it('Should call onToggle from the control in either state', async () => {
  const onToggle = jest.fn();
  const { rerender } = render(
    <SpeakerSection {...defaultProps} rows={rows(7)} onToggle={onToggle} />,
  );

  await userEvent.click(screen.getByRole('button'));
  rerender(
    <SpeakerSection
      {...defaultProps}
      rows={rows(7)}
      expanded
      onToggle={onToggle}
    />,
  );
  await userEvent.click(screen.getByRole('button'));

  expect(onToggle).toHaveBeenCalledTimes(2);
});
