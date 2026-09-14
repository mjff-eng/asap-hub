import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MetricsCard, { Metric, MoodStatus } from '../MetricsCard';

const metrics: Metric[] = [
  {
    id: 'metric-one',
    name: 'Metric One',
    status: 'Y',
    philosophy: 'Philosophy for metric one.',
    definition: 'Definition for metric one.',
  },
  {
    id: 'metric-two',
    name: 'Metric Two',
    status: 'N',
    philosophy: 'Philosophy for metric two.',
    definition: 'Definition for metric two.',
  },
];

const mockScrollHeight = (scrollHeight: number) => {
  const original = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'scrollHeight',
  );
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    get: () => scrollHeight,
  });
  return () => {
    if (original) {
      Object.defineProperty(HTMLElement.prototype, 'scrollHeight', original);
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, 'scrollHeight');
    }
  };
};

describe('MetricsCard', () => {
  it('renders the column headers and each metric', () => {
    render(<MetricsCard metrics={metrics} />);

    expect(screen.getAllByText('Metric').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Status').length).toBeGreaterThan(0);
    expect(screen.getByText('Metric One')).toBeInTheDocument();
    expect(screen.getByText('Metric Two')).toBeInTheDocument();
    expect(screen.getByText('Y')).toBeInTheDocument();
    expect(screen.getByText('N')).toBeInTheDocument();
  });

  it('keeps desktop metric details collapsed initially', () => {
    render(<MetricsCard metrics={metrics} />);

    expect(
      screen.queryByTestId('metrics-card-details-desktop'),
    ).not.toBeInTheDocument();
    expect(screen.getAllByTestId('metrics-card-details-mobile')).toHaveLength(
      2,
    );
  });

  it('always shows philosophy and definition in the mobile expandable text', () => {
    render(<MetricsCard metrics={metrics} />);
    const mobileDetails = screen.getAllByTestId(
      'metrics-card-details-mobile',
    )[0]!;

    expect(
      within(mobileDetails).getByText('ASAP Philosophy'),
    ).toBeInTheDocument();
    expect(
      within(mobileDetails).getByText('Metric Definition'),
    ).toBeInTheDocument();
  });

  it('expands and collapses an individual metric on desktop', async () => {
    const user = userEvent.setup();
    render(<MetricsCard metrics={metrics} />);

    const expandButton = screen.getByLabelText('Expand Metric One');
    await user.click(expandButton);

    const desktopDetails = screen.getByTestId('metrics-card-details-desktop');
    expect(
      within(desktopDetails).getByText('Definition for metric one.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Collapse Metric One')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Collapse Metric One'));
    expect(
      screen.queryByTestId('metrics-card-details-desktop'),
    ).not.toBeInTheDocument();
  });

  it('expands overflowing mobile details once and hides the toggle', async () => {
    const restoreScrollHeight = mockScrollHeight(500);
    try {
      const user = userEvent.setup();
      render(<MetricsCard metrics={metrics} />);

      const showMoreButtons = screen.getAllByRole('button', {
        name: /Show more/i,
      });
      expect(showMoreButtons).toHaveLength(2);
      await user.click(showMoreButtons[0]!);

      expect(
        screen.getAllByRole('button', { name: /Show more/i }),
      ).toHaveLength(1);
      expect(
        screen.queryByRole('button', { name: /Show less/i }),
      ).not.toBeInTheDocument();
    } finally {
      restoreScrollHeight();
    }
  });
});

describe('MoodStatus', () => {
  it('exposes the mood label as an accessible name on the status icon', () => {
    render(<MoodStatus percentage={95} />);

    expect(
      screen.getByRole('button', {
        name: 'Your team is doing an outstanding job! Keep up the good work!',
      }),
    ).toBeInTheDocument();
  });

  it('exposes the limited data label when percentage is null', () => {
    render(<MoodStatus percentage={null} />);

    expect(
      screen.getByRole('button', {
        name: 'There is limited available data to calculate this metric at this time.',
      }),
    ).toBeInTheDocument();
  });
});
