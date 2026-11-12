import { ResolvedChapter } from '@asap-hub/demo-timeline';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChapterList from '../ChapterList';
import { fieldGesture, Gesture, GestureProvider } from '../gesture';

const marker = (overrides: Partial<ResolvedChapter> = {}): ResolvedChapter => ({
  id: 'chapter-a',
  kind: 'marker',
  startMs: 5000,
  title: 'Attendance',
  ...overrides,
});

const renderList = (
  resolved: ResolvedChapter[] = [marker()],
  gesture: Gesture = { begin: jest.fn(), end: jest.fn() },
) => {
  const handlers = {
    onAdd: jest.fn(),
    onRename: jest.fn(),
    onRetime: jest.fn(),
    onRemove: jest.fn(),
    onSelectTitle: jest.fn(),
  };
  render(
    <GestureProvider value={gesture}>
      <ChapterList resolved={resolved} readOnly={false} canAdd {...handlers} />
    </GestureProvider>,
  );
  return handlers;
};

describe('the start of a chapter', () => {
  const start = () => screen.getByLabelText('Start of Attendance');

  it('moves the chapter to a time typed as m:ss', async () => {
    const { onRetime } = renderList();

    await userEvent.clear(start());
    await userEvent.type(start(), '1:05{Enter}');

    expect(onRetime).toHaveBeenCalledWith('chapter-a', 65000);
    expect(start()).not.toHaveFocus();
  });

  it('springs back when the time cannot be read', async () => {
    const { onRetime } = renderList();

    await userEvent.clear(start());
    await userEvent.type(start(), 'soon');
    fireEvent.blur(start());

    expect(onRetime).not.toHaveBeenCalled();
    expect(start()).toHaveValue('0:05');
  });

  it('does nothing when the time is left as it was', async () => {
    const { onRetime } = renderList();

    await userEvent.click(start());
    await userEvent.tab();

    expect(onRetime).not.toHaveBeenCalled();
    expect(start()).toHaveValue('0:05');
  });

  it('throws a half typed time away on Escape', async () => {
    const { onRetime } = renderList();

    await userEvent.clear(start());
    await userEvent.type(start(), '1:{Escape}');

    expect(onRetime).not.toHaveBeenCalled();
    expect(start()).toHaveValue('0:05');
    expect(start()).not.toHaveFocus();
  });

  it('names a chapter that has no title yet in its own words', () => {
    renderList([marker({ title: '' })]);

    expect(screen.getByLabelText('Start of this chapter')).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Chapters need a name to appear in the exported demo.',
    );
  });
});

describe('the name of a chapter', () => {
  // typing a name is one undo step, not one per letter
  it('is one gesture from focus to blur', async () => {
    const gesture = { begin: jest.fn(), end: jest.fn() };
    const { onRename } = renderList([marker()], gesture);
    const name = screen.getByLabelText('Name of the chapter at 0:05');

    await userEvent.type(name, '!');
    expect(gesture.begin).toHaveBeenCalledWith(fieldGesture);
    expect(onRename).toHaveBeenCalledWith('chapter-a', 'Attendance!');

    await userEvent.tab();
    expect(gesture.end).toHaveBeenCalledWith(fieldGesture);
  });
});

describe('removing a chapter', () => {
  it('names the chapter it removes', async () => {
    const { onRemove } = renderList();

    await userEvent.click(
      screen.getByRole('button', { name: 'Remove the chapter at 0:05' }),
    );

    expect(onRemove).toHaveBeenCalledWith('chapter-a');
  });
});

describe('a title card in the list', () => {
  const titleCard = marker({
    id: 'title-a',
    kind: 'title',
    startMs: 8000,
    title: 'Next steps',
  });

  it('shows when it starts and leads back to the card', async () => {
    const { onSelectTitle, onRetime } = renderList([titleCard]);

    expect(screen.getByText('0:08')).toBeVisible();
    expect(screen.queryByLabelText(/^Start of/)).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Next steps (title card)' }),
    );

    expect(onSelectTitle).toHaveBeenCalledWith('title-a');
    expect(onRetime).not.toHaveBeenCalled();
  });
});
