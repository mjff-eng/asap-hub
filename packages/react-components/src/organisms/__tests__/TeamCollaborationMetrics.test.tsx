import { render, screen } from '@testing-library/react';

import TeamCollaborationMetrics from '../TeamCollaborationMetrics';
import { getPerformanceMoodIcon, getPerformanceMoodLabel } from '../../utils';

jest.mock('../../utils', () => ({
  ...jest.requireActual('../../utils'),
  getPerformanceMoodIcon: jest.fn(() => 'mood-icon'),
  getPerformanceMoodLabel: jest.fn(() => 'mood-label'),
}));

describe('TeamCollaborationMetrics', () => {
  it('derives the mood icon and label from the metric percentage', () => {
    render(<TeamCollaborationMetrics withinTeamCoProduction={62} />);

    expect(
      screen.getByText('Within Team Co-Production of Research Outputs'),
    ).toBeInTheDocument();
    const ticketBands = { outstandingMin: 81, adequateMin: 50 };
    expect(getPerformanceMoodIcon).toHaveBeenCalledWith(62, false, ticketBands);
    expect(getPerformanceMoodLabel).toHaveBeenCalledWith(
      62,
      false,
      ticketBands,
    );
  });
});
