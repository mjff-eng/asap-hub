import { gp2 } from '@asap-hub/model';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import EventRelatedOutputsCard from '../EventRelatedOutputsCard';

const getTable = () => screen.getByTestId('event-related-research');

const createOutput = (
  index: number,
  overrides: Partial<gp2.RelatedOutputs> = {},
): gp2.RelatedOutputs => ({
  id: `output-${index}`,
  title: `Output ${index}`,
  documentType: 'Dataset',
  entity: {
    id: `project-${index}`,
    title: `Project ${index}`,
    type: 'Projects',
  },
  ...overrides,
});

it('renders the title, description and column headers', () => {
  render(<EventRelatedOutputsCard relatedOutputs={[createOutput(1)]} />);
  expect(
    screen.getByRole('heading', { name: 'Related Research' }),
  ).toBeVisible();
  expect(
    screen.getByText('Find all shared research outputs related to this event.'),
  ).toBeVisible();
  ['Output', 'Type', 'From'].forEach((title) =>
    expect(screen.getAllByText(title)[0]).toBeInTheDocument(),
  );
  expect(screen.queryByText('Status')).not.toBeInTheDocument();
});

it('renders an empty state', () => {
  render(<EventRelatedOutputsCard relatedOutputs={[]} />);
  expect(screen.getByText('No related research available.')).toBeVisible();
});

it('links the output and its project', () => {
  render(<EventRelatedOutputsCard relatedOutputs={[createOutput(1)]} />);
  expect(
    within(getTable()).getByRole('link', { name: 'Output 1' }),
  ).toHaveAttribute('href', '/outputs/output-1');
  expect(screen.getByRole('link', { name: 'Project 1' })).toHaveAttribute(
    'href',
    '/projects/project-1',
  );
  expect(screen.getByText('Dataset')).toBeInTheDocument();
});

it('links a working group source', () => {
  render(
    <EventRelatedOutputsCard
      relatedOutputs={[
        createOutput(1, {
          entity: {
            id: 'wg-1',
            title: 'A Working Group',
            type: 'WorkingGroups',
          },
        }),
      ]}
    />,
  );
  expect(screen.getByRole('link', { name: 'A Working Group' })).toHaveAttribute(
    'href',
    '/working-groups/wg-1',
  );
});

it('shows the output type next to the document type for articles', () => {
  render(
    <EventRelatedOutputsCard
      relatedOutputs={[
        createOutput(1, { documentType: 'Article', type: 'Research' }),
      ]}
    />,
  );
  expect(within(getTable()).getByText('Article')).toBeInTheDocument();
  expect(within(getTable()).getByText('Research')).toBeInTheDocument();
});

it('does not show the output type for documents other than articles', () => {
  render(
    <EventRelatedOutputsCard
      relatedOutputs={[createOutput(1, { type: 'Research' })]}
    />,
  );
  expect(within(getTable()).getByText('Dataset')).toBeInTheDocument();
  expect(within(getTable()).queryByText('Research')).not.toBeInTheDocument();
});

it('omits the source when it is missing', () => {
  render(
    <EventRelatedOutputsCard
      relatedOutputs={[createOutput(1, { entity: undefined })]}
    />,
  );
  expect(screen.getAllByText('From')).toHaveLength(1);
});

it('shows five outputs and toggles the rest', async () => {
  render(
    <EventRelatedOutputsCard
      relatedOutputs={Array.from({ length: 6 }, (_, i) => createOutput(i))}
    />,
  );
  expect(within(getTable()).queryByText('Output 5')).not.toBeInTheDocument();

  await userEvent.click(
    screen.getByRole('button', { name: 'View More Outputs' }),
  );
  expect(within(getTable()).getByText('Output 5')).toBeInTheDocument();

  await userEvent.click(
    screen.getByRole('button', { name: 'View Less Outputs' }),
  );
  expect(within(getTable()).queryByText('Output 5')).not.toBeInTheDocument();
});
