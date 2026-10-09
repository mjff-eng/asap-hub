import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';

import EventMonthFilter from '../EventMonthFilter';

const yearCounts = {
  2020: 0,
  2021: 12,
  2022: 18,
  2023: 0,
  2024: 37,
  2025: 11,
  2026: 27,
};
const monthCounts = { 0: 7, 1: 1, 3: 10, 4: 5, 5: 3, 8: 1 };

const renderEventMonthFilter = (
  props: Partial<ComponentProps<typeof EventMonthFilter>> = {},
) =>
  render(
    <EventMonthFilter
      year={2026}
      yearCounts={yearCounts}
      monthCounts={monthCounts}
      selection={new Set()}
      onChangeYear={jest.fn()}
      onChangeSelection={jest.fn()}
      currentDate={new Date(2026, 8, 29)}
      {...props}
    />,
  );

const clickOnTheFilter = () =>
  userEvent.click(screen.getByRole('button', { name: /^filter/i }));

const getMonthButton = (month: string) =>
  screen.getByText(month).closest('button') as HTMLButtonElement;

const getYearRow = (year: number) =>
  within(screen.getByRole('list'))
    .getByText(`${year}`)
    .closest('button') as HTMLButtonElement;

describe('panel', () => {
  it('opens and closes with the filter button', async () => {
    renderEventMonthFilter();
    expect(screen.getByText('Jan')).not.toBeVisible();

    await clickOnTheFilter();
    expect(screen.getByText('Jan')).toBeVisible();

    await clickOnTheFilter();
    expect(screen.getByText('Jan')).not.toBeVisible();
  });

  it('closes when clicking outside', async () => {
    renderEventMonthFilter();
    await clickOnTheFilter();

    fireEvent.mouseDown(document);
    expect(screen.getByText('Jan')).not.toBeVisible();
  });

  it('stays open after selecting a month', async () => {
    renderEventMonthFilter();
    await clickOnTheFilter();

    await userEvent.click(getMonthButton('Jan'));
    expect(screen.getByText('Jan')).toBeVisible();
  });

  it('shows the months again when reopened from the year list', async () => {
    renderEventMonthFilter();
    await clickOnTheFilter();
    await userEvent.click(screen.getByRole('button', { name: /select year/i }));
    expect(screen.queryByText('Jan')).not.toBeInTheDocument();

    fireEvent.mouseDown(document);
    await clickOnTheFilter();
    expect(screen.getByText('Jan')).toBeVisible();
  });
});

describe('count badge', () => {
  it('is not shown without a selection', () => {
    renderEventMonthFilter();
    expect(screen.queryByTestId('filter-count')).not.toBeInTheDocument();
  });

  it('counts every selected item, including other years', () => {
    renderEventMonthFilter({
      selection: new Set(['2026-01', '2026-04', '2025-03']),
    });
    expect(screen.getByTestId('filter-count')).toHaveTextContent('3');
  });
});

describe('month grid', () => {
  it('shows the event count of each month', async () => {
    renderEventMonthFilter();
    await clickOnTheFilter();

    expect(getMonthButton('Jan')).toHaveTextContent('7 events');
    expect(getMonthButton('Feb')).toHaveTextContent('1 event');
    expect(getMonthButton('Mar')).toHaveTextContent('None');
  });

  it('disables months without events', async () => {
    renderEventMonthFilter();
    await clickOnTheFilter();

    expect(getMonthButton('Jan')).toBeEnabled();
    expect(getMonthButton('Mar')).toBeDisabled();
  });

  it('hides the count of future months without events', async () => {
    renderEventMonthFilter();
    await clickOnTheFilter();

    expect(getMonthButton('Oct')).toHaveTextContent(/^Oct$/);
    expect(getMonthButton('Oct')).toBeDisabled();
    expect(getMonthButton('Sep')).toHaveTextContent('1 event');
  });

  it('selects a month', async () => {
    const onChangeSelection = jest.fn();
    renderEventMonthFilter({ onChangeSelection });
    await clickOnTheFilter();

    await userEvent.click(getMonthButton('Apr'));
    expect(onChangeSelection).toHaveBeenCalledWith(new Set(['2026-04']));
  });

  it('deselects a selected month', async () => {
    const onChangeSelection = jest.fn();
    renderEventMonthFilter({
      selection: new Set(['2026-01', '2026-04']),
      onChangeSelection,
    });
    await clickOnTheFilter();

    await userEvent.click(getMonthButton('Jan'));
    expect(onChangeSelection).toHaveBeenCalledWith(new Set(['2026-04']));
  });

  it('replaces the whole-year selection when selecting a month', async () => {
    const onChangeSelection = jest.fn();
    renderEventMonthFilter({ selection: new Set(['2026']), onChangeSelection });
    await clickOnTheFilter();

    await userEvent.click(getMonthButton('Jan'));
    expect(onChangeSelection).toHaveBeenCalledWith(new Set(['2026-01']));
  });

  it('marks only the selected months of the displayed year', async () => {
    renderEventMonthFilter({ selection: new Set(['2026-01', '2025-04']) });
    await clickOnTheFilter();

    expect(getMonthButton('Jan')).toHaveAttribute('aria-pressed', 'true');
    expect(getMonthButton('Apr')).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('all of year', () => {
  it('shows the total of the year', async () => {
    renderEventMonthFilter();
    await clickOnTheFilter();

    expect(screen.getByText('All of 2026').closest('button')).toHaveTextContent(
      '27 events',
    );
  });

  it('selects the whole year and clears its months', async () => {
    const onChangeSelection = jest.fn();
    renderEventMonthFilter({
      selection: new Set(['2026-01', '2025-03']),
      onChangeSelection,
    });
    await clickOnTheFilter();

    await userEvent.click(screen.getByText('All of 2026'));
    expect(onChangeSelection).toHaveBeenCalledWith(
      new Set(['2025-03', '2026']),
    );
  });

  it('is marked when the whole year is selected', async () => {
    renderEventMonthFilter({ selection: new Set(['2026']) });
    await clickOnTheFilter();

    expect(screen.getByText('All of 2026').closest('button')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('is disabled when the year has no events', async () => {
    renderEventMonthFilter({ year: 2023, monthCounts: {} });
    await clickOnTheFilter();

    expect(screen.getByText('All of 2023').closest('button')).toBeDisabled();
  });
});

describe('year navigation', () => {
  it('goes to the previous and next year', async () => {
    const onChangeYear = jest.fn();
    renderEventMonthFilter({ year: 2024, onChangeYear });
    await clickOnTheFilter();

    await userEvent.click(
      screen.getByRole('button', { name: 'Previous year' }),
    );
    expect(onChangeYear).toHaveBeenLastCalledWith(2023);

    await userEvent.click(screen.getByRole('button', { name: 'Next year' }));
    expect(onChangeYear).toHaveBeenLastCalledWith(2025);
  });

  it('disables the arrows at the first and last year', async () => {
    const { rerender } = renderEventMonthFilter({ year: 2026 });
    await clickOnTheFilter();
    expect(screen.getByRole('button', { name: 'Next year' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous year' })).toBeEnabled();

    rerender(
      <EventMonthFilter
        year={2020}
        yearCounts={yearCounts}
        monthCounts={{}}
        selection={new Set()}
        onChangeYear={jest.fn()}
        onChangeSelection={jest.fn()}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Previous year' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next year' })).toBeEnabled();
  });
});

describe('year list', () => {
  const openYearList = async () => {
    await clickOnTheFilter();
    await userEvent.click(screen.getByRole('button', { name: /select year/i }));
  };

  it('lists the years in ascending order with their counts', async () => {
    renderEventMonthFilter();
    await openYearList();

    const rows = within(screen.getByRole('list')).getAllByRole('button');
    expect(rows.map((row) => row.textContent)).toEqual([
      '2020None',
      '202112 events',
      '202218 events',
      '2023None',
      '202437 events',
      '202511 events',
      '202627 events',
    ]);
  });

  it('marks the year toggle as expanded', async () => {
    renderEventMonthFilter();
    await openYearList();

    expect(
      screen.getByRole('button', { name: /select year/i }),
    ).toHaveAttribute('aria-expanded', 'true');
  });

  it('disables years without events', async () => {
    renderEventMonthFilter();
    await openYearList();

    expect(getYearRow(2023)).toBeDisabled();
    expect(getYearRow(2024)).toBeEnabled();
  });

  it('disables the arrows', async () => {
    renderEventMonthFilter({ year: 2024 });
    await openYearList();

    expect(
      screen.getByRole('button', { name: 'Previous year' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next year' })).toBeDisabled();
  });

  it('marks the years that have a selection', async () => {
    renderEventMonthFilter({ selection: new Set(['2026-01', '2025']) });
    await openYearList();

    expect(
      within(getYearRow(2026)).getByLabelText('Has selection'),
    ).toBeInTheDocument();
    expect(
      within(getYearRow(2025)).getByLabelText('Has selection'),
    ).toBeInTheDocument();
    expect(
      within(getYearRow(2024)).queryByLabelText('Has selection'),
    ).not.toBeInTheDocument();
  });

  it('changes the year and goes back to the months', async () => {
    const onChangeYear = jest.fn();
    renderEventMonthFilter({ onChangeYear });
    await openYearList();

    await userEvent.click(getYearRow(2024));
    expect(onChangeYear).toHaveBeenCalledWith(2024);
    expect(screen.getByText('Jan')).toBeVisible();
  });

  it('clears the whole selection', async () => {
    const onChangeSelection = jest.fn();
    renderEventMonthFilter({
      selection: new Set(['2026-01', '2025']),
      onChangeSelection,
    });
    await openYearList();

    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(onChangeSelection).toHaveBeenCalledWith(new Set());
  });
});
