import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { EditorShortcuts, useEditorShortcuts } from '../useEditorShortcuts';

const handlers = (overrides: Partial<EditorShortcuts> = {}) => ({
  readOnly: false,
  onToggle: jest.fn(),
  onNudge: jest.fn(),
  onSplit: jest.fn(),
  onDuplicate: jest.fn(),
  onToggleMute: jest.fn(),
  onRemove: jest.fn(),
  onUndo: jest.fn(),
  onRedo: jest.fn(),
  ...overrides,
});

const press = (init: KeyboardEventInit) => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  document.body.dispatchEvent(event);
  return event;
};

describe('undo and redo', () => {
  it.each`
    modifier
    ${'ctrlKey'}
    ${'metaKey'}
  `('undoes with $modifier and Z', ({ modifier }) => {
    const shortcuts = handlers();
    renderHook(() => useEditorShortcuts(shortcuts));

    const event = press({ code: 'KeyZ', [modifier]: true });

    expect(shortcuts.onUndo).toHaveBeenCalledTimes(1);
    expect(shortcuts.onRedo).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it('redoes with Shift added', () => {
    const shortcuts = handlers();
    renderHook(() => useEditorShortcuts(shortcuts));

    press({ code: 'KeyZ', ctrlKey: true, shiftKey: true });

    expect(shortcuts.onRedo).toHaveBeenCalledTimes(1);
    expect(shortcuts.onUndo).not.toHaveBeenCalled();
  });

  // the browser's own undo would act on a page with nothing to undo
  it('still keeps the key from the browser while read only', () => {
    const shortcuts = handlers({ readOnly: true });
    renderHook(() => useEditorShortcuts(shortcuts));

    const event = press({ code: 'KeyZ', ctrlKey: true });

    expect(shortcuts.onUndo).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });
});

describe('the playhead keys', () => {
  it.each`
    code            | shiftKey | deltaMs
    ${'ArrowLeft'}  | ${false} | ${-100}
    ${'ArrowLeft'}  | ${true}  | ${-1000}
    ${'ArrowRight'} | ${false} | ${100}
    ${'ArrowRight'} | ${true}  | ${1000}
  `(
    'moves the playhead by $deltaMs ms on $code (shift $shiftKey)',
    ({ code, shiftKey, deltaMs }) => {
      const shortcuts = handlers();
      renderHook(() => useEditorShortcuts(shortcuts));

      const event = press({ code, shiftKey });

      expect(shortcuts.onNudge).toHaveBeenCalledWith(deltaMs);
      expect(event.defaultPrevented).toBe(true);
    },
  );

  it('plays and pauses on Space, even while read only', () => {
    const shortcuts = handlers({ readOnly: true });
    renderHook(() => useEditorShortcuts(shortcuts));

    press({ code: 'Space' });

    expect(shortcuts.onToggle).toHaveBeenCalledTimes(1);
  });
});

describe('the editing keys', () => {
  it.each`
    code           | handler
    ${'KeyS'}      | ${'onSplit'}
    ${'KeyD'}      | ${'onDuplicate'}
    ${'KeyM'}      | ${'onToggleMute'}
    ${'Delete'}    | ${'onRemove'}
    ${'Backspace'} | ${'onRemove'}
  `('runs $handler on $code', ({ code, handler }) => {
    const shortcuts = handlers();
    renderHook(() => useEditorShortcuts(shortcuts));

    press({ code });

    expect(shortcuts[handler as keyof typeof shortcuts]).toHaveBeenCalledTimes(
      1,
    );
  });

  it('edits nothing while read only', () => {
    const shortcuts = handlers({ readOnly: true });
    renderHook(() => useEditorShortcuts(shortcuts));

    ['KeyS', 'KeyD', 'KeyM', 'Delete'].forEach((code) => press({ code }));

    expect(shortcuts.onSplit).not.toHaveBeenCalled();
    expect(shortcuts.onDuplicate).not.toHaveBeenCalled();
    expect(shortcuts.onToggleMute).not.toHaveBeenCalled();
    expect(shortcuts.onRemove).not.toHaveBeenCalled();
  });

  // Cmd+S, Cmd+D and Alt combinations belong to the browser
  it.each`
    modifier
    ${'ctrlKey'}
    ${'metaKey'}
    ${'altKey'}
  `('leaves a key alone when $modifier is held', ({ modifier }) => {
    const shortcuts = handlers();
    renderHook(() => useEditorShortcuts(shortcuts));

    const event = press({ code: 'KeyS', [modifier]: true });
    press({ code: 'Space', [modifier]: true });

    expect(shortcuts.onSplit).not.toHaveBeenCalled();
    expect(shortcuts.onToggle).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('ignores keys it has no binding for', () => {
    const shortcuts = handlers();
    renderHook(() => useEditorShortcuts(shortcuts));

    const event = press({ code: 'KeyQ' });

    expect(event.defaultPrevented).toBe(false);
    Object.values(shortcuts)
      .filter((value): value is jest.Mock => typeof value === 'function')
      .forEach((handler) => expect(handler).not.toHaveBeenCalled());
  });
});

describe('a control that owns the keyboard', () => {
  it('keeps its keys from the editor', () => {
    const shortcuts = handlers();
    renderHook(() => useEditorShortcuts(shortcuts));
    render(<input aria-label="Heading" />);

    fireEvent.keyDown(screen.getByLabelText('Heading'), { code: 'KeyS' });
    fireEvent.keyDown(screen.getByLabelText('Heading'), { code: 'Space' });

    expect(shortcuts.onSplit).not.toHaveBeenCalled();
    expect(shortcuts.onToggle).not.toHaveBeenCalled();
  });
});

// playback re-renders with new handlers every frame, and the listener must
// call the newest ones rather than those it saw when it subscribed
it('calls the handlers from the latest render', () => {
  const first = handlers();
  const second = handlers();
  const { rerender } = renderHook(
    (shortcuts) => useEditorShortcuts(shortcuts),
    {
      initialProps: first,
    },
  );

  rerender(second);
  press({ code: 'KeyS' });

  expect(first.onSplit).not.toHaveBeenCalled();
  expect(second.onSplit).toHaveBeenCalledTimes(1);
});

it('stops listening once the editor unmounts', () => {
  const shortcuts = handlers();
  const { unmount } = renderHook(() => useEditorShortcuts(shortcuts));

  unmount();
  press({ code: 'KeyS' });

  expect(shortcuts.onSplit).not.toHaveBeenCalled();
});
