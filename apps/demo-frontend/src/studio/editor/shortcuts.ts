// The shortcut itself takes either modifier, so only the name of it follows the
// platform. Nothing in the editor said these existed at all.
const onApple = (): boolean =>
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

export const undoHint = onApple() ? 'Cmd+Z' : 'Ctrl+Z';
export const redoHint = onApple() ? 'Cmd+Shift+Z' : 'Ctrl+Shift+Z';
export const pickHint = onApple() ? 'Cmd+click' : 'Ctrl+click';

// on a Mac Ctrl+click is the context menu, so only Cmd means pick there;
// elsewhere either modifier reads as the pick
export const isPickModifier = (event: {
  metaKey: boolean;
  ctrlKey: boolean;
}): boolean => (onApple() ? event.metaKey : event.ctrlKey || event.metaKey);
