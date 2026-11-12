import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ChapterList from '../ChapterList';

const chapters = [
  { startMs: 0, title: 'New section 1' },
  { startMs: 20950, title: 'New section 2' },
];

const list = (extra: Partial<Parameters<typeof ChapterList>[0]> = {}) =>
  render(
    <ChapterList
      chapters={chapters}
      currentSeconds={0}
      onSelect={jest.fn()}
      {...extra}
    />,
  );

// a watcher can take just the section they need, cut by the render itself
describe('chapter downloads', () => {
  it('offers one download per chapter, pointed at its own file', () => {
    list({
      sectionUrlOf: (index) => `/media/v1/r1/sections/${index}.mp4`,
      sectionFileNameOf: (chapter) => `${chapter.title}.mp4`,
    });

    const first = screen.getByRole('link', {
      name: 'Download New section 1',
    });
    expect(first).toHaveAttribute('href', '/media/v1/r1/sections/0.mp4');
    expect(first).toHaveAttribute('download', 'New section 1.mp4');
    expect(
      screen.getByRole('link', { name: 'Download New section 2' }),
    ).toHaveAttribute('href', '/media/v1/r1/sections/1.mp4');
  });

  it('offers none when the render published no sections', () => {
    list();

    expect(screen.queryByRole('link', { name: /download/i })).toBeNull();
  });

  it('keeps the chapter buttons their own controls, never nested', () => {
    list({ sectionUrlOf: (index) => `/s/${index}.mp4` });

    const button = screen.getByRole('button', { name: /New section 1/ });
    expect(button.querySelector('a')).toBeNull();
  });
});

it('says so when a demo has no chapters', () => {
  list({ chapters: [] });

  expect(screen.getByText('This demo has no chapters yet.')).toBeVisible();
  expect(screen.queryByRole('button')).toBeNull();
});

describe('previewing a chapter', () => {
  it('previews the chapter under the pointer and drops it on leave', async () => {
    const onHover = jest.fn();
    list({ onHover });
    const row = screen.getByRole('button', { name: /New section 2/ });

    await userEvent.hover(row);
    expect(onHover).toHaveBeenLastCalledWith(chapters[1]);

    await userEvent.unhover(row);
    expect(onHover).toHaveBeenLastCalledWith(null);
  });

  it('previews the focused chapter and drops it when focus moves on', async () => {
    const onHover = jest.fn();
    list({ onHover });

    await userEvent.tab();
    expect(onHover).toHaveBeenLastCalledWith(chapters[0]);

    await userEvent.tab();
    expect(onHover).toHaveBeenCalledWith(null);
    expect(onHover).toHaveBeenLastCalledWith(chapters[1]);
  });
});
