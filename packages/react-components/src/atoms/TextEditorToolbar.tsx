import { useCallback, useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  mergeRegister,
  $getNearestNodeOfType,
  $findMatchingParent,
} from '@lexical/utils';
import { $isHeadingNode } from '@lexical/rich-text';
import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
} from '@lexical/list';

import { $isLinkNode } from '@lexical/link';
import { $setBlocksType } from '@lexical/selection';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  COMMAND_PRIORITY_CRITICAL,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
} from 'lexical';

import {
  arrowClockwise,
  arrowCounterclockwise,
  indent,
  link as linkIcon,
  listOL,
  listUL,
  outdent,
  typeBold,
  typeItalic,
  typeStrikethrough,
} from '../icons/editor';
import { colour } from '../colors';
import FloatingLinkEditor from './FloatingLinkEditor';
import { getSelectedNode } from './lexical-utils';

const dividerStyles = css({
  width: '1px',
  backgroundColor: colour.border.tertiary,
  margin: '0 4px',
});

const toolbarStyles = css({
  display: 'flex',
  marginBottom: '1px',
  background: colour.background.primary,
  padding: '4px',
  borderTopLeftRadius: '10px',
  borderTopRightRadius: '10px',
  verticalAlign: 'middle',
});

const toolbarItemStyles = ({
  spaced = false,
  active = false,
}: {
  spaced?: boolean;
  active?: boolean;
}) =>
  css({
    border: '0',
    display: 'flex',
    background: active ? colour.background.active : 'none',
    borderRadius: '10px',
    padding: '8px',
    cursor: 'pointer',
    verticalAlign: 'middle',

    marginRight: spaced ? '2px' : 0,

    '& svg': {
      opacity: active ? 1 : 0.5,
    },
  });

const Divider = () => <div css={dividerStyles} />;

const blockTypeToBlockName = {
  bullet: 'Bulleted List',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  h4: 'Heading 4',
  h5: 'Heading 5',
  h6: 'Heading 6',
  number: 'Numbered List',
  check: 'Checklist',
  paragraph: 'Normal',
  quote: 'Quote',
};
export default function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [activeEditor, setActiveEditor] = useState(editor);

  const [blockType, setBlockType] =
    useState<keyof typeof blockTypeToBlockName>('paragraph');

  const toolbarRef = useRef(null);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [isLinkEditorOpen, setIsLinkEditorOpen] = useState(false);

  /* istanbul ignore next */
  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const anchorNode = selection.anchor.getNode();
      let element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : $findMatchingParent(anchorNode, (e) => {
              const parent = e.getParent();
              return parent !== null && $isRootOrShadowRoot(parent);
            });

      if (element === null) {
        element = anchorNode.getTopLevelElementOrThrow();
      }

      const elementKey = element.getKey();
      const elementDOM = activeEditor.getElementByKey(elementKey);

      if (elementDOM !== null) {
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType<ListNode>(
            anchorNode,
            ListNode,
          );
          const type = parentList
            ? parentList.getListType()
            : element.getListType();
          setBlockType(type);
        } else {
          const type = $isHeadingNode(element)
            ? element.getTag()
            : element.getType();
          if (type in blockTypeToBlockName) {
            setBlockType(type as keyof typeof blockTypeToBlockName);
          }
        }
      }
    }

    if ($isRangeSelection(selection)) {
      // Update text format
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));

      const node = getSelectedNode(selection);
      const parent = node.getParent();
      if ($isLinkNode(parent)) {
        setIsLink(true);
        setLinkUrl(parent.getURL());
      } else if ($isLinkNode(node)) {
        setIsLink(true);
        setLinkUrl(node.getURL());
      } else {
        setIsLink(false);
        setLinkUrl('');
      }
    }
  }, [activeEditor]);

  /* istanbul ignore next */
  useEffect(
    () =>
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        (_payload, newEditor) => {
          setActiveEditor(newEditor);
          $updateToolbar();
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    [editor, $updateToolbar],
  );

  useEffect(() => {
    activeEditor.getEditorState().read(() => {
      $updateToolbar();
    });
  }, [activeEditor, $updateToolbar]);

  useEffect(
    () =>
      mergeRegister(
        activeEditor.registerUpdateListener(({ editorState }) => {
          editorState.read(() => {
            $updateToolbar();
          });
        }),
        activeEditor.registerCommand<boolean>(
          CAN_UNDO_COMMAND,
          (payload) => {
            setCanUndo(payload);
            return false;
          },
          COMMAND_PRIORITY_CRITICAL,
        ),
        activeEditor.registerCommand<boolean>(
          CAN_REDO_COMMAND,
          (payload) => {
            setCanRedo(payload);
            return false;
          },
          COMMAND_PRIORITY_CRITICAL,
        ),
      ),
    [$updateToolbar, activeEditor, editor],
  );

  const formatParagraph = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode());
      }
    });
  };

  const formatBulletList = () => {
    if (blockType !== 'bullet') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else {
      formatParagraph();
    }
  };

  const formatNumberedList = () => {
    if (blockType !== 'number') {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    } else {
      formatParagraph();
    }
  };

  const openLinkEditor = () => {
    if (isLink) {
      setIsLinkEditorOpen(true);
    } else {
      activeEditor.getEditorState().read(() => {
        const selection = $getSelection();
        if (
          $isRangeSelection(selection) &&
          !selection.isCollapsed() &&
          selection.getTextContent().length > 0
        ) {
          setLinkUrl('');
          setIsLinkEditorOpen(true);
        }
      });
    }
  };

  return (
    <div css={toolbarStyles} ref={toolbarRef}>
      <button
        disabled={!canUndo}
        onClick={(e) => {
          e.preventDefault();
          editor.dispatchCommand(UNDO_COMMAND, undefined);
        }}
        css={toolbarItemStyles({ spaced: true })}
        aria-label="Undo"
      >
        {arrowCounterclockwise}
      </button>
      <button
        disabled={!canRedo}
        onClick={(e) => {
          e.preventDefault();
          editor.dispatchCommand(REDO_COMMAND, undefined);
        }}
        css={toolbarItemStyles({})}
        aria-label="Redo"
      >
        {arrowClockwise}
      </button>
      <Divider />
      <button
        onClick={(e) => {
          e.preventDefault();
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
        }}
        css={toolbarItemStyles({ spaced: true, active: isBold })}
        aria-label="Format Bold"
      >
        {typeBold}
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
        }}
        css={toolbarItemStyles({ spaced: true, active: isItalic })}
        aria-label="Format Italics"
      >
        {typeItalic}
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
        }}
        css={toolbarItemStyles({ spaced: true, active: isStrikethrough })}
        aria-label="Format Strikethrough"
      >
        {typeStrikethrough}
      </button>
      <Divider />
      <button
        onClick={(e) => {
          e.preventDefault();
          formatBulletList();
        }}
        css={toolbarItemStyles({
          spaced: true,
          active: blockType === 'bullet',
        })}
        aria-label="Bullet List"
      >
        {listUL}
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          formatNumberedList();
        }}
        css={toolbarItemStyles({
          spaced: true,
          active: blockType === 'number',
        })}
        aria-label="Numbered List"
      >
        {listOL}
      </button>
      <Divider />
      <button
        onClick={(e) => {
          e.preventDefault();
          editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
        }}
        css={toolbarItemStyles({
          spaced: true,
        })}
        aria-label="Outdent"
      >
        {outdent}
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
        }}
        css={toolbarItemStyles({
          spaced: true,
        })}
        aria-label="Indent"
      >
        {indent}
      </button>
      <Divider />
      <button
        onClick={(e) => {
          e.preventDefault();
          openLinkEditor();
        }}
        css={toolbarItemStyles({ spaced: true, active: isLink })}
        aria-label="Insert Link"
      >
        {linkIcon}
      </button>
      <FloatingLinkEditor
        isOpen={isLinkEditorOpen}
        initialUrl={linkUrl}
        onClose={() => setIsLinkEditorOpen(false)}
      />
    </div>
  );
}
