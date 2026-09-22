import { render } from '@testing-library/react';

import AttendanceProgressBar from '../AttendanceProgressBar';

describe('AttendanceProgressBar', () => {
  it('renders a progressbar with the given percentage', () => {
    const { getByRole } = render(<AttendanceProgressBar percentage={65} />);
    const bar = getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '65');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('sets the fill width from the percentage', () => {
    const { getByRole } = render(<AttendanceProgressBar percentage={65} />);
    expect(getByRole('progressbar').firstElementChild).toHaveStyle(
      'width: 65%',
    );
  });

  it('clamps out-of-range percentages to 0–100', () => {
    const { getByRole, rerender } = render(
      <AttendanceProgressBar percentage={150} />,
    );
    expect(getByRole('progressbar').firstElementChild).toHaveStyle(
      'width: 100%',
    );

    rerender(<AttendanceProgressBar percentage={-20} />);
    expect(getByRole('progressbar').firstElementChild).toHaveStyle('width: 0%');
  });

  it('reveals only the 0-to-value slice of the ramp, so the tip tracks the value', () => {
    const { getByRole, rerender } = render(
      <AttendanceProgressBar percentage={50} />,
    );
    expect(getByRole('progressbar').firstElementChild).toHaveStyle(
      'background-size: 200% 100%',
    );

    rerender(<AttendanceProgressBar percentage={0} />);
    expect(getByRole('progressbar').firstElementChild).toHaveStyle(
      'background-size: 100% 100%',
    );
  });

  it('exposes the label as an accessible name', () => {
    const { getByRole } = render(
      <AttendanceProgressBar percentage={65} label="This event" />,
    );
    expect(getByRole('progressbar')).toHaveAttribute(
      'aria-label',
      'This event',
    );
  });
});
