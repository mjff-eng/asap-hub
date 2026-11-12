import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import EventRelatedResearchCard, {
  EventRelatedResearchItem,
} from '../EventRelatedResearchCard';

const getTable = () => screen.getByTestId('event-related-research');

const createItem = (index: number): EventRelatedResearchItem => ({
  id: `output-${index}`,
  title: `Output ${index}`,
  href: `/outputs/output-${index}`,
  documentType: 'Dataset',
});

it('renders the title, description and column headers', () => {
  render(<EventRelatedResearchCard relatedResearch={[createItem(1)]} />);
  expect(
    screen.getByRole('heading', { name: 'Related Research' }),
  ).toBeInTheDocument();
  expect(
    screen.getByText('Find all shared research outputs related to this event.'),
  ).toBeInTheDocument();
  ['Output', 'Type', 'From'].forEach((title) =>
    expect(screen.getAllByText(title)[0]).toBeInTheDocument(),
  );
  expect(screen.queryByText('Status')).not.toBeInTheDocument();
});

it('renders an empty state', () => {
  render(<EventRelatedResearchCard relatedResearch={[]} />);
  expect(screen.getByText('No related research available.')).toBeVisible();
});

it('renders the output link, type and linked source', () => {
  render(
    <EventRelatedResearchCard
      relatedResearch={[
        {
          ...createItem(1),
          source: {
            title: 'A team',
            href: '/teams/team-1',
            icon: <svg role="img" aria-label="source icon" />,
          },
        },
      ]}
    />,
  );
  const table = getTable();
  expect(within(table).getByRole('link', { name: 'Output 1' })).toHaveAttribute(
    'href',
    '/outputs/output-1',
  );
  expect(within(table).getByText('Dataset')).toBeInTheDocument();
  expect(within(table).getByRole('link', { name: 'A team' })).toHaveAttribute(
    'href',
    '/teams/team-1',
  );
  expect(
    within(table).getByRole('img', { name: 'source icon' }),
  ).toBeInTheDocument();
});

it('renders a source without a link', () => {
  render(
    <EventRelatedResearchCard
      relatedResearch={[
        { ...createItem(1), source: { title: 'Multiple teams' } },
      ]}
    />,
  );
  expect(screen.getByText('Multiple teams')).toBeInTheDocument();
  expect(
    screen.queryByRole('link', { name: 'Multiple teams' }),
  ).not.toBeInTheDocument();
});

it('shows five outputs and toggles the rest', async () => {
  render(
    <EventRelatedResearchCard
      relatedResearch={[1, 2, 3, 4, 5, 6].map(createItem)}
    />,
  );
  expect(
    within(getTable()).queryByRole('link', { name: 'Output 6' }),
  ).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /View More/ }));
  expect(
    within(getTable()).getByRole('link', { name: 'Output 6' }),
  ).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /View Less/ }));
  expect(
    within(getTable()).queryByRole('link', { name: 'Output 6' }),
  ).not.toBeInTheDocument();
});

it('shows the type as a pill next to the document type for articles', () => {
  render(
    <EventRelatedResearchCard
      relatedResearch={[
        { ...createItem(1), documentType: 'Article', type: 'Preprint' },
      ]}
    />,
  );
  const table = getTable();
  expect(within(table).getByText('Article')).toBeInTheDocument();
  expect(within(table).getByText('Preprint')).toBeInTheDocument();
});

it('does not show the type for documents other than articles', () => {
  render(
    <EventRelatedResearchCard
      relatedResearch={[{ ...createItem(1), type: 'Code' }]}
    />,
  );
  const table = getTable();
  expect(within(table).getByText('Dataset')).toBeInTheDocument();
  expect(within(table).queryByText('Code')).not.toBeInTheDocument();
});

it('expands a mobile row to show the other columns', async () => {
  render(
    <EventRelatedResearchCard
      relatedResearch={[
        { ...createItem(1), documentType: 'Article', type: 'Preprint' },
      ]}
    />,
  );
  const list = screen.getByTestId('event-related-research-mobile');
  expect(within(list).queryByText('Preprint')).not.toBeInTheDocument();
  await userEvent.click(
    within(list).getByRole('button', { name: 'Show details for Output 1' }),
  );
  expect(within(list).getByText('Preprint')).toBeInTheDocument();
});
