import { render, screen } from '@testing-library/react';
import StaticPerformanceCard from '../StaticPerformanceCard';

describe('StaticPerformanceCard', () => {
  it('renders the performance card with default values', () => {
    render(<StaticPerformanceCard />);

    expect(screen.getByText('Outstanding:')).toBeInTheDocument();
    expect(screen.getByText('≥ 90%')).toBeInTheDocument();
    expect(screen.getByText('Adequate:')).toBeInTheDocument();
    expect(screen.getByText('80% - 89%')).toBeInTheDocument();
    expect(screen.getByText('Needs Improvement:')).toBeInTheDocument();
    expect(screen.getByText('< 80%')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Limited data' }),
    ).toBeInTheDocument();
  });

  it('renders with custom performance thresholds', () => {
    render(
      <StaticPerformanceCard
        outstanding={95}
        adequate={85}
        needsImprovement={70}
        limitedData={5}
      />,
    );

    expect(screen.getByText('≥ 95%')).toBeInTheDocument();
    expect(screen.getByText('85% - 94%')).toBeInTheDocument();
    expect(screen.getByText('< 70%')).toBeInTheDocument();
  });

  it('does not render legend when legend prop is not provided', () => {
    render(<StaticPerformanceCard />);

    const legendSection = screen.queryByTitle('percentage');
    expect(legendSection).not.toBeInTheDocument();
  });

  it('renders legend when legend prop is provided', () => {
    const testLegend =
      'This is a test legend explaining the performance metrics.';
    render(<StaticPerformanceCard legend={testLegend} />);

    expect(screen.getByText(testLegend)).toBeInTheDocument();
    expect(screen.getByTitle('percentage').closest('svg')).toBeInTheDocument();
  });

  it('renders legend with custom performance thresholds', () => {
    const testLegend = 'Custom legend for different thresholds.';
    render(
      <StaticPerformanceCard
        outstanding={95}
        adequate={85}
        needsImprovement={70}
        legend={testLegend}
      />,
    );

    expect(screen.getByText(testLegend)).toBeInTheDocument();
    expect(screen.getByText('≥ 95%')).toBeInTheDocument();
    expect(screen.getByText('85% - 94%')).toBeInTheDocument();
    expect(screen.getByText('< 70%')).toBeInTheDocument();
  });

  it('renders legend with empty string (should not show legend)', () => {
    render(<StaticPerformanceCard legend="" />);

    const legendSection = screen.queryByTitle('percentage');
    expect(legendSection).not.toBeInTheDocument();
  });

  it('renders legend with long text', () => {
    const longLegend =
      'This is a very long legend text that explains in detail how the percentage is calculated as total research outputs shared across all publications divided by total research outputs identified across all publications and should wrap properly in the UI.';
    render(<StaticPerformanceCard legend={longLegend} />);

    expect(screen.getByText(longLegend)).toBeInTheDocument();
    expect(screen.getByTitle('percentage').closest('svg')).toBeInTheDocument();
  });

  it('renders all performance icons', () => {
    render(<StaticPerformanceCard />);

    const happyFaceIcon = screen
      .getByText('Outstanding:')
      .closest('div')
      ?.querySelector('svg');
    const neutralFaceIcon = screen
      .getByText('Adequate:')
      .closest('div')
      ?.querySelector('svg');
    const sadFaceIcon = screen
      .getByText('Needs Improvement:')
      .closest('div')
      ?.querySelector('svg');
    const infoIcon = screen
      .getByRole('heading', { name: 'Limited data' })
      .closest('div')
      ?.querySelector('svg');

    expect(happyFaceIcon).toBeInTheDocument();
    expect(neutralFaceIcon).toBeInTheDocument();
    expect(sadFaceIcon).toBeInTheDocument();
    expect(infoIcon).toBeInTheDocument();
  });

  it('renders percentage icon in legend when legend is provided', () => {
    const testLegend = 'Legend with percentage icon.';
    render(<StaticPerformanceCard legend={testLegend} />);

    const percentageIcon = screen.getByTitle('percentage').closest('svg');
    expect(percentageIcon).toBeInTheDocument();
    expect(percentageIcon?.tagName).toBe('svg');
  });

  it('handles edge case with zero values', () => {
    render(
      <StaticPerformanceCard
        outstanding={0}
        adequate={0}
        needsImprovement={0}
        limitedData={0}
        legend="Edge case legend"
      />,
    );

    expect(screen.getByText('≥ 0%')).toBeInTheDocument();
    expect(screen.getByText('0% - -1%')).toBeInTheDocument();
    expect(screen.getByText('< 0%')).toBeInTheDocument();
    expect(screen.getByText('Edge case legend')).toBeInTheDocument();
  });
});
