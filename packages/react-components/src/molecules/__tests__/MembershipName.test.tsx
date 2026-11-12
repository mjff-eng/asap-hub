import { render, screen } from '@testing-library/react';

import MembershipName from '../MembershipName';

describe('MembershipName', () => {
  it('links the name and shows the badge and subtitle', () => {
    render(
      <MembershipName
        icon={<svg data-testid="icon" />}
        href="/teams/1"
        badge={<span>inactive</span>}
        subtitle="Lead PI of this lab"
      >
        Alpha
      </MembershipName>,
    );
    expect(screen.getByRole('link', { name: 'Alpha' })).toHaveAttribute(
      'href',
      '/teams/1',
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('inactive')).toBeInTheDocument();
    expect(screen.getByText('Lead PI of this lab')).toBeInTheDocument();
  });

  it('renders plain text without an href', () => {
    render(<MembershipName icon={null}>Alpha</MembershipName>);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });
});
