import { disable, enable } from '@asap-hub/flags';
import { render, screen } from '@testing-library/react';

import AnalyticsPageHeader from '../AnalyticsPageHeader';

it('renders the header', () => {
  render(<AnalyticsPageHeader onExportAnalytics={jest.fn} />);
  expect(screen.getByText(/Analytics/, { selector: 'h1' })).toBeVisible();
});

describe('Awards tab', () => {
  afterEach(() => {
    disable('AWARDS_TAB');
  });

  it('renders the Awards tab when the flag is enabled', () => {
    enable('AWARDS_TAB');
    render(<AnalyticsPageHeader onExportAnalytics={jest.fn} />);
    expect(screen.getByRole('link', { name: /Awards/ })).toBeVisible();
  });

  it('does not render the Awards tab when the flag is disabled', () => {
    disable('AWARDS_TAB');
    render(<AnalyticsPageHeader onExportAnalytics={jest.fn} />);
    expect(
      screen.queryByRole('link', { name: /Awards/ }),
    ).not.toBeInTheDocument();
  });
});
