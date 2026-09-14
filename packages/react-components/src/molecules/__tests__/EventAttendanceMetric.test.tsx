import { render } from '@testing-library/react';

import EventAttendanceMetric from '../EventAttendanceMetric';

describe('EventAttendanceMetric', () => {
  it('renders the percentage, both caption lines and a single bar', () => {
    const { getByText, getAllByRole } = render(
      <EventAttendanceMetric
        label="This event"
        value={72}
        caption="18 of 25 teams"
        captionDetail="from the interest group"
      />,
    );
    expect(getByText('72%')).toBeVisible();
    expect(getByText('18 of 25 teams')).toBeVisible();
    expect(getByText('from the interest group')).toBeVisible();
    expect(getAllByRole('progressbar')).toHaveLength(1);
  });

  it('labels the bar and fills it to the value', () => {
    const { getByRole } = render(
      <EventAttendanceMetric
        label="This event"
        value={40}
        caption="2 of 5 teams"
        captionDetail="from the interest group"
      />,
    );
    const bar = getByRole('progressbar', { name: 'This event' });
    expect(bar).toHaveAttribute('aria-valuenow', '40');
    expect(bar.firstChild).toHaveStyle('width: 40%');
  });
});
