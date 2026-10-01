import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { Chapter } from '../../api/types';
import ChaptersPanel from '../ChaptersPanel';

const chapters: Chapter[] = [
  { startMs: 0, title: 'Intro' },
  { startMs: 60000, title: 'Event attendance' },
  { startMs: 150000, title: 'Wrap up' },
];

const renderPanel = (activeIndex = 1) => {
  const onSelect = jest.fn();
  render(
    <ChaptersPanel
      chapters={chapters}
      durationMs={300000}
      activeIndex={activeIndex}
      onSelect={onSelect}
    />,
  );
  return { onSelect };
};

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

it('lists every chapter with its start time and length', () => {
  renderPanel();

  const rows = screen.getAllByRole('button');
  expect(rows).toHaveLength(3);

  expect(within(rows[0] as HTMLElement).getByText('Intro')).toBeVisible();
  expect(within(rows[0] as HTMLElement).getByText('0:00')).toBeVisible();
  expect(within(rows[1] as HTMLElement).getByText('1:00')).toBeVisible();
  // the last chapter runs to the end of the video
  expect(within(rows[2] as HTMLElement).getByText('2:30')).toBeVisible();
});

it('marks only the active row as current', () => {
  renderPanel(2);

  const rows = screen.getAllByRole('button');
  expect(rows[0]).toHaveAttribute('aria-current', 'false');
  expect(rows[2]).toHaveAttribute('aria-current', 'true');
});

it('reports the chapter that was clicked', async () => {
  const { onSelect } = renderPanel();

  await userEvent.click(screen.getByRole('button', { name: /Wrap up/ }));

  expect(onSelect).toHaveBeenCalledWith(chapters[2]);
});

it('scrolls the active row into view when it changes', () => {
  const scrollIntoView = jest.fn();
  Element.prototype.scrollIntoView = scrollIntoView;

  renderPanel(0);

  expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
});
