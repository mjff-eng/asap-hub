import { render, screen } from '@testing-library/react';
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
