import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CosaBanner } from '../CosaBanner';

const COSA_BANNER_DISMISSED_KEY = 'crn-cosa-banner-dismissed';

describe('CosaBanner', () => {
  beforeEach(() => {
    localStorage.removeItem(COSA_BANNER_DISMISSED_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(COSA_BANNER_DISMISSED_KEY);
  });

  it('does not render when banner has been dismissed', () => {
    localStorage.setItem(COSA_BANNER_DISMISSED_KEY, 'true');

    const { container } = render(<CosaBanner />);

    expect(container.firstChild).toBeNull();
  });

  it('renders the banner when not dismissed', async () => {
    render(<CosaBanner />);

    await waitFor(() => {
      expect(screen.getByText(/COSA is currently live!/i)).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Access the event through the/i),
    ).toBeInTheDocument();
  });

  it('links to the COSA website', async () => {
    render(<CosaBanner />);

    const link = await screen.findByRole('link', { name: /COSA website/i });

    expect(link).toHaveAttribute(
      'href',
      'https://event.fourwaves.com/asapcosa2026',
    );
  });

  it('dismisses the banner when close button is clicked', async () => {
    const { container } = render(<CosaBanner />);

    await waitFor(() => {
      expect(screen.getByText(/COSA is currently live!/i)).toBeInTheDocument();
    });

    const closeButton = screen.getByLabelText('Close');
    await userEvent.click(closeButton);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });

    expect(localStorage.getItem(COSA_BANNER_DISMISSED_KEY)).toBe('true');
  });

  it('does not render after being dismissed and re-rendered', async () => {
    const { rerender } = render(<CosaBanner />);

    await waitFor(() => {
      expect(screen.getByText(/COSA is currently live!/i)).toBeInTheDocument();
    });

    const closeButton = screen.getByLabelText('Close');
    await userEvent.click(closeButton);

    await waitFor(() => {
      expect(
        screen.queryByText(/COSA is currently live!/i),
      ).not.toBeInTheDocument();
    });

    rerender(<CosaBanner />);

    expect(
      screen.queryByText(/COSA is currently live!/i),
    ).not.toBeInTheDocument();
  });
});
