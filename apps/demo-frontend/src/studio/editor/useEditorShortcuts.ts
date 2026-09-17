import { useEffect, useRef } from 'react';

export type EditorShortcuts = {
  readOnly: boolean;
  onToggle: () => void;
  onNudge: (deltaMs: number) => void;
  onSplit: () => void;
  onDuplicate: () => void;
  onToggleMute: () => void;
  onRemove: () => void;
  onUndo: () => void;
  onRedo: () => void;
};

// A shortcut must never take a key away from whatever the creator is actually
// using: Space presses a focused button, the arrows drive a focused slider, and
// a text field owns every key it is given.
export const claimsKeyboard = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable ||
    Boolean(
      target.closest(
        'button, a[href], select, [role="slider"], [role="group"]',
      ),
    ));

// The handlers change on every frame of playback, so the listener reads the
// latest ones through a ref rather than resubscribing sixty times a second.
export const useEditorShortcuts = (shortcuts: EditorShortcuts): void => {
  const latest = useRef(shortcuts);
  latest.current = shortcuts;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (claimsKeyboard(event.target)) {
        return;
      }
      const {
        readOnly,
        onToggle,
        onNudge,
        onSplit,
        onDuplicate,
        onToggleMute,
        onRemove,
        onUndo,
        onRedo,
      } = latest.current;

      // undo is the one binding that wants the modifier; everything else must
      // stay out of the way of Cmd+S, Cmd+D and the rest of the browser
      const accelerator = event.metaKey || event.ctrlKey;
      if (accelerator && event.code === 'KeyZ') {
        event.preventDefault();
        if (!readOnly) {
          (event.shiftKey ? onRedo : onUndo)();
        }
        return;
      }
      if (accelerator || event.altKey) {
        return;
      }

      const transport: Record<string, () => void> = {
        Space: onToggle,
        ArrowLeft: () => onNudge(event.shiftKey ? -1000 : -100),
        ArrowRight: () => onNudge(event.shiftKey ? 1000 : 100),
      };
      const editing: Record<string, () => void> = {
        KeyS: onSplit,
        KeyD: onDuplicate,
        KeyM: onToggleMute,
        Delete: onRemove,
        Backspace: onRemove,
      };

      const move = transport[event.code];
      if (move) {
        event.preventDefault();
        move();
        return;
      }

      const edit = editing[event.code];
      if (edit && !readOnly) {
        edit();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
};
