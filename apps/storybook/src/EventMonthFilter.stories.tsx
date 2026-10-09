import {
  EventMonthFilter,
  EventMonthFilterSelection,
} from '@asap-hub/react-components';
import { ComponentProps, useState } from 'react';

export default {
  title: 'Organisms / Events / Month Filter',
  component: EventMonthFilter,
};

type MonthCounts = ComponentProps<typeof EventMonthFilter>['monthCounts'];

const yearCounts = {
  2020: 0,
  2021: 12,
  2022: 18,
  2023: 0,
  2024: 37,
  2025: 11,
  2026: 27,
};

const monthCountsByYear: Record<number, MonthCounts> = {
  2021: { 2: 4, 5: 6, 9: 2 },
  2022: { 0: 3, 3: 5, 6: 4, 10: 6 },
  2024: { 0: 5, 1: 4, 2: 3, 4: 6, 6: 5, 8: 7, 10: 7 },
  2025: { 2: 4, 6: 3, 10: 4 },
  2026: { 0: 7, 1: 1, 3: 10, 4: 5, 5: 3, 8: 1 },
};

const manyYearCounts: Record<number, number> = Object.fromEntries(
  Array.from({ length: 15 }, (_, index) => {
    const listYear = 2012 + index;
    return [listYear, yearCounts[listYear as keyof typeof yearCounts] ?? 9];
  }),
);

const Template = ({
  initialSelection = [],
  yearCounts: templateYearCounts = yearCounts,
}: {
  initialSelection?: string[];
  yearCounts?: Record<number, number>;
}) => {
  const [year, setYear] = useState(2026);
  const [selection, setSelection] = useState<EventMonthFilterSelection>(
    new Set(initialSelection),
  );

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        width: 360,
        minHeight: 520,
      }}
    >
      <EventMonthFilter
        year={year}
        yearCounts={templateYearCounts}
        monthCounts={
          monthCountsByYear[year] ??
          (year in yearCounts ? {} : { 1: 2, 5: 3, 9: 4 })
        }
        selection={selection}
        onChangeYear={setYear}
        onChangeSelection={setSelection}
        currentDate={new Date(2026, 8, 29)}
      />
    </div>
  );
};

export const Default = () => <Template />;

export const SelectedMonths = () => (
  <Template initialSelection={['2026-01', '2026-04']} />
);

export const SelectedYear = () => <Template initialSelection={['2026']} />;

export const SelectedAcrossYears = () => (
  <Template initialSelection={['2026-01', '2026-04', '2025-03']} />
);

export const ManyYears = () => <Template yearCounts={manyYearCounts} />;
