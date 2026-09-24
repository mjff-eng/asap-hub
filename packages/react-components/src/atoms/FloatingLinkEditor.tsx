import { css } from '@emotion/react';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import {
  $getSelection,
  $isRangeSelection,
  $setSelection,
  BaseSelection,
  COMMAND_PRIORITY_LOW,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { colour } from '../colors';
import { getSelectedNode } from './lexical-utils';

const editorContainerStyles = css({
  position: 'absolute',
  zIndex: 10,
  background: '#fff',
  border: '1px solid #ddd',
  borderRadius: '8px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  padding: '6px',
  display: 'flex',
  alignItems: 'flex-start',
  gap: '4px',
});

const inputColumnStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
});

const inputStyles = css({
  border: '1px solid #ddd',
  borderRadius: '4px',
  padding: '6px 8px',
  fontSize: '14px',
  outline: 'none',
  minWidth: '240px',
});

const inputErrorStyles = css({
  borderColor: '#d6453d',
});

const errorStyles = css({
  color: '#d6453d',
  fontSize: '12px',
  maxWidth: '300px',
});

const buttonStyles = css({
  border: '0',
  background: 'transparent',
  cursor: 'pointer',
  padding: '6px 10px',
  borderRadius: '4px',
  fontSize: '13px',
  '&:hover': {
    background: colour.background.tertiary,
  },
});

const linkPreviewStyles = css({
  fontSize: '13px',
  maxWidth: '300px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: 'rgb(33, 111, 219)',
});

const SAFE_URL_PATTERN = /^(?:https?:\/\/|mailto:|tel:)/i;
const UNSAFE_SCHEME_PATTERN = /^(?:javascript|data|vbscript|file):/i;
const HAS_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;
// Bare hostname (with optional port and path), or localhost with optional port
const BARE_URL_PATTERN =
  /^(?:[\w-]+(?:\.[\w-]+)+|localhost)(?::\d+)?(?:[/?#].*)?$/i;

export const getUrlFromSelection = (
  selection: BaseSelection | null,
): string | null => {
  if (!$isRangeSelection(selection)) return null;
  const node = getSelectedNode(selection);
  const parent = node.getParent();
  if ($isLinkNode(parent)) return parent.getURL();
  if ($isLinkNode(node)) return node.getURL();
  return null;
};

// Zero-width characters (U+200B..U+200D, U+FEFF) and bidi controls
// (U+202A..U+202E) sometimes hitch a ride on copy-pasted URLs.
const ZERO_WIDTH_AND_BIDI_RE = /[\u200B-\u200D\uFEFF\u202A-\u202E]/g;

export const sanitizeUrl = (url: string): string => {
  // Strip zero-width and bidi control characters that can sneak in via copy
  // & paste, then trim regular whitespace.
  const trimmed = url.replace(ZERO_WIDTH_AND_BIDI_RE, '').trim();
  if (!trimmed) return '';
  if (UNSAFE_SCHEME_PATTERN.test(trimmed)) {
    return '';
  }
  if (SAFE_URL_PATTERN.test(trimmed)) {
    return trimmed;
  }
  // Match bare hostnames (e.g. example.com, example.com:8080, localhost:3000)
  // before falling into the scheme check, since "example.com:8080" otherwise
  // looks like an unknown scheme due to the colon.
  if (BARE_URL_PATTERN.test(trimmed)) {
    return `https://${trimmed}`;
  }
  if (HAS_SCHEME_PATTERN.test(trimmed)) {
    // Reject any scheme we don't explicitly recognize as safe
    return '';
  }
  return '';
};

export type FloatingLinkEditorProps = {
  isOpen: boolean;
  initialUrl: string;
  onClose: () => void;
};

const FloatingLinkEditor = ({
  isOpen,
  initialUrl,
  onClose,
}: FloatingLinkEditorProps) => {
  const [editor] = useLexicalComposerContext();
  const editorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const savedSelectionRef = useRef<BaseSelection | null>(null);
  const [url, setUrl] = useState(initialUrl);
  const [isEditing, setIsEditing] = useState(!initialUrl);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // Only reset state when the popover transitions from closed to open. Once
  // open we intentionally ignore subsequent prop changes (e.g. the toolbar
  // updating linkUrl in response to Lexical SELECTION_CHANGE events while the
  // user is editing the URL field in our floating input).
  const wasOpenRef = useRef(false);
  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (!isOpen || wasOpen) return;
    setUrl(initialUrl);
    setIsEditing(!initialUrl);
    setError(null);
    // Capture the editor selection so we can restore it before applying.
    // Once the user clicks into our floating input the DOM selection moves
    // out of the contenteditable, and Lexical will replace its internal
    // selection with `null`, breaking TOGGLE_LINK_COMMAND.
    editor.getEditorState().read(() => {
      const current = $getSelection();
      savedSelectionRef.current = current ? current.clone() : null;
    });
  }, [editor, initialUrl, isOpen]);

  // Position the popover once when it opens, based on the editor's current
  // text selection rectangle. We deliberately do NOT track resize/scroll
  // afterwards: as soon as the user clicks into our floating input the DOM
  // selection moves out of the editor and `getBoundingClientRect()` returns
  // a zero-size rect, which would otherwise unmount the popover mid-paste.
  useLayoutEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }
    const nativeSelection = window.getSelection();
    if (!nativeSelection || nativeSelection.rangeCount === 0) {
      setPosition(null);
      return;
    }
    const rect = nativeSelection.getRangeAt(0).getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setPosition(null);
      return;
    }
    setPosition({
      top: rect.bottom + window.scrollY + 8,
      left: rect.left + window.scrollX,
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || isEditing) return undefined;
    return mergeRegister(
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          editor.getEditorState().read(() => {
            const next = getUrlFromSelection($getSelection());
            if (next !== null) setUrl(next);
          });
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, isOpen, isEditing]);

  useEffect(() => {
    if (isOpen && isEditing && position) {
      const id = window.requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
      return () => window.cancelAnimationFrame(id);
    }
    return undefined;
  }, [isOpen, isEditing, position]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleClickOutside = (e: MouseEvent) => {
      // Ignore non-primary buttons (right-click opens the browser context
      // menu for "Paste"; closing the popover on that mousedown would tear
      // the input down before the paste lands).
      if (e.button !== 0) return;
      if (editorRef.current && !editorRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen || !position) return null;

  const withSavedSelection = (cb: () => void) => {
    const saved = savedSelectionRef.current;
    if (saved) {
      editor.update(() => {
        $setSelection(saved.clone());
      });
    }
    cb();
  };

  const applyLink = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      // Empty input — treat as a cancel rather than a validation failure
      onClose();
      return;
    }
    const sanitized = sanitizeUrl(trimmed);
    if (!sanitized) {
      setError('Please enter a valid URL (http://, https://, mailto:, tel:).');
      return;
    }
    try {
      withSavedSelection(() =>
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, sanitized),
      );
    } catch {
      // If Lexical rejects the link (e.g. because the editor selection is no
      // longer valid), surface a recoverable error instead of leaving the
      // popover in a broken state.
      setError(
        'Could not apply the link. Please try selecting the text again.',
      );
      return;
    }
    onClose();
  };

  const removeLink = () => {
    withSavedSelection(() => editor.dispatchCommand(TOGGLE_LINK_COMMAND, null));
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyLink();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return createPortal(
    <div
      ref={editorRef}
      css={editorContainerStyles}
      style={{ top: position.top, left: position.left }}
      onMouseDown={(e) => {
        if (e.target !== inputRef.current) {
          e.preventDefault();
        }
      }}
    >
      {isEditing ? (
        <>
          <div css={inputColumnStyles}>
            <input
              ref={inputRef}
              css={[inputStyles, error ? inputErrorStyles : undefined]}
              type="text"
              value={url}
              placeholder="https://example.com"
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={handleKeyDown}
              // Stop input events from bubbling up to any Lexical handlers
              // attached to ancestor contenteditables. Otherwise pasting or
              // typing in the URL field can be misread by the editor and
              // collapse its selection / tear the popover down.
              onMouseDown={(e) => e.stopPropagation()}
              onPaste={(e) => e.stopPropagation()}
              onCut={(e) => e.stopPropagation()}
              onCopy={(e) => e.stopPropagation()}
              onInput={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
              onBlur={(e) => {
                // If focus leaves the input but the popover is still open
                // (e.g. browser autofill pulled focus away momentarily),
                // pull it back so the user can keep typing.
                const next = e.relatedTarget as Node | null;
                if (
                  isEditing &&
                  editorRef.current &&
                  (!next || !editorRef.current.contains(next))
                ) {
                  requestAnimationFrame(() => inputRef.current?.focus());
                }
              }}
              aria-label="Link URL"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'link-url-error' : undefined}
            />
            {error && (
              <div id="link-url-error" role="alert" css={errorStyles}>
                {error}
              </div>
            )}
          </div>
          <button
            type="button"
            css={buttonStyles}
            onClick={applyLink}
            aria-label="Apply Link"
          >
            Apply
          </button>
        </>
      ) : (
        <>
          <a
            href={sanitizeUrl(url)}
            target="_blank"
            rel="noopener noreferrer"
            css={linkPreviewStyles}
          >
            {url}
          </a>
          <button
            type="button"
            css={buttonStyles}
            onClick={() => setIsEditing(true)}
            aria-label="Edit Link"
          >
            Edit
          </button>
          <button
            type="button"
            css={buttonStyles}
            onClick={removeLink}
            aria-label="Remove Link"
          >
            Remove
          </button>
        </>
      )}
    </div>,
    document.body,
  );
};

export default FloatingLinkEditor;
