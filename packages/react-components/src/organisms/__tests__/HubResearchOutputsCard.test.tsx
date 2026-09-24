import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import HubResearchOutputsCard, {
  HubResearchOutputRow,
} from '../HubResearchOutputsCard';

const rows: HubResearchOutputRow[] = [
  { outputType: 'Articles', numberOfOutputs: 42, publicPercentage: 95 },
  { outputType: 'Code/Software', numberOfOutputs: 18, publicPercentage: 85 },
  { outputType: 'Datasets', numberOfOutputs: 27, publicPercentage: 50 },
  { outputType: 'Lab Materials', numberOfOutputs: 12, publicPercentage: 100 },
  { outputType: 'Protocols', numberOfOutputs: 8, publicPercentage: 40 },
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

describe('HubResearchOutputsCard', () => {
  it('renders table headers', () => {
    render(<HubResearchOutputsCard rows={rows} />);
    const table = screen.getByTestId('hub-research-outputs-table');

    expect(
      within(table).getByRole('columnheader', { name: 'Output Type' }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole('columnheader', {
        name: /# Outputs.*ASAP-Funded/,
      }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole('columnheader', {
        name: /% Public Outputs.*ASAP-Funded/,
      }),
    ).toBeInTheDocument();
  });

  it('renders output types, counts, and percentages', () => {
    render(<HubResearchOutputsCard rows={rows} />);
    const table = screen.getByTestId('hub-research-outputs-table');

    expect(within(table).getByText('Articles')).toBeInTheDocument();
    expect(within(table).getByText('Code/Software')).toBeInTheDocument();
    expect(within(table).getByText('Datasets')).toBeInTheDocument();
    expect(within(table).getByText('Lab Materials')).toBeInTheDocument();
    expect(within(table).getByText('Protocols')).toBeInTheDocument();

    expect(within(table).getByText('42')).toBeInTheDocument();
    expect(within(table).getByText('95%')).toBeInTheDocument();
    expect(within(table).getByText('85%')).toBeInTheDocument();
    expect(within(table).getByText('50%')).toBeInTheDocument();
    expect(within(table).getByText('100%')).toBeInTheDocument();
    expect(within(table).getByText('40%')).toBeInTheDocument();
  });

  it('renders the same rows in the mobile list', () => {
    render(<HubResearchOutputsCard rows={rows} />);
    const mobileList = screen.getByTestId('hub-research-outputs-mobile');

    expect(within(mobileList).getAllByText('Output Type')).toHaveLength(
      rows.length,
    );
    expect(within(mobileList).getByText('Articles')).toBeInTheDocument();
    expect(within(mobileList).getByText('42')).toBeInTheDocument();
    expect(within(mobileList).getByText('95%')).toBeInTheDocument();
  });

  it('renders N/A when public percentage is null', () => {
    render(
      <HubResearchOutputsCard
        rows={[
          {
            outputType: 'Articles',
            numberOfOutputs: 0,
            publicPercentage: null,
          },
        ]}
      />,
    );
    const table = screen.getByTestId('hub-research-outputs-table');

    expect(within(table).getByText('N/A')).toBeInTheDocument();
  });

  it('renders an info tooltip on the public outputs header', () => {
    render(<HubResearchOutputsCard rows={rows} />);
    const table = screen.getByTestId('hub-research-outputs-table');
    const mobileList = screen.getByTestId('hub-research-outputs-mobile');

    expect(within(table).getByTitle('Info')).toBeInTheDocument();
    expect(within(mobileList).getAllByTitle('Info')).toHaveLength(rows.length);
  });

  it('renders the metric details', () => {
    render(<HubResearchOutputsCard rows={rows} />);

    expect(screen.getByText('ASAP Philosophy:')).toBeVisible();
    expect(screen.getByText('Metric Definition:')).toBeVisible();
  });

  it('expands the metric details when they overflow', async () => {
    const restoreScrollHeight = mockScrollHeight(500);
    try {
      render(<HubResearchOutputsCard rows={rows} />);

      const button = screen.getByRole('button', { name: /Show more/i });
      expect(button).toBeVisible();

      await userEvent.click(button);
      expect(
        screen.queryByRole('button', { name: /Show less/i }),
      ).not.toBeInTheDocument();
    } finally {
      restoreScrollHeight();
    }
  });

  it('does not render a toggle when the metric details fit', () => {
    render(<HubResearchOutputsCard rows={rows} />);

    expect(
      screen.queryByRole('button', { name: /Show (more|less)/i }),
    ).not.toBeInTheDocument();
  });
});
