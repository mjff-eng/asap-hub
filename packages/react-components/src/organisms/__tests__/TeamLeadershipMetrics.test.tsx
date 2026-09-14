import { render, screen } from '@testing-library/react';

import TeamLeadershipMetrics from '../TeamLeadershipMetrics';

describe('TeamLeadershipMetrics', () => {
  it('maps each leadership flag onto the metrics card', () => {
    render(
      <TeamLeadershipMetrics workingGroupLead interestGroupLead={false} />,
    );

    expect(screen.getByText('Working Group(s) Lead')).toBeInTheDocument();
    expect(screen.getByText('Interest Group(s) Lead')).toBeInTheDocument();
    expect(screen.getByText('Y')).toBeInTheDocument();
    expect(screen.getByText('N')).toBeInTheDocument();
  });
});
