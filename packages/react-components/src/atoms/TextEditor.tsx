import { css, SerializedStyles } from '@emotion/react';
import { CodeNode } from '@lexical/code';
import {
  $isAutoLinkNode,
  $isLinkNode,
  AutoLinkNode,
  LinkNode,
} from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import {
  AutoLinkPlugin,
  createLinkMatcherWithRegExp,
} from '@lexical/react/LexicalAutoLinkPlugin';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { forwardRef, useEffect } from 'react';

import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
} from '@lexical/markdown';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { $nodesOfType, EditorState } from 'lexical';
import { colour } from '../colors';
import { styles, useValidation, validationMessageStyles } from '../form';
import { noop } from '../utils';
import ToolbarPlugin from './TextEditorToolbar';
import EditorRefPluginWrapper from './EditorRefPluginWrapper';

const theme = {
  paragraph: 'editor-paragraph',
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2',
    h3: 'editor-heading-h3',
    h4: 'editor-heading-h4',
    h5: 'editor-heading-h5',
    h6: 'editor-heading-h6',
  },
  list: {
    nested: {
      listitem: 'editor-nested-listitem',
    },
    ol: 'editor-list-ol',
    ul: 'editor-list-ul',
    listitem: 'editor-listItem',
  },
  link: 'editor-link',
  text: {
    bold: 'editor-textBold',
    italic: 'editor-textItalic',
    strikethrough: 'editor-textStrikethrough',
    underline: 'editor-textUnderline',
    underlineStrikethrough: 'editor-textUnderlineStrikethrough',
  },
};

const containerStyles = css({
  margin: '0px auto',
  borderRadius: '2px',
  width: '100%',
  color: '#000',
  position: 'relative',
  lineHeight: '20px',
  fontWeight: 400,
  textAlign: 'left',
  borderTopLeftRadius: '10px',
  borderTopRightRadius: '10px',

  // editor styles
  '& .editor-link': {
    color: 'rgb(33, 111, 219)',
    textDecoration: 'none',
  },

  '& .editor-paragraph': {
    margin: 0,
    marginBottom: '8px',
    position: 'relative',
    '&:last-child': {
      marginBottom: 0,
    },
  },

  '& .editor-list-ol': {
    padding: 0,
    margin: 0,
    marginLeft: '16px',
  },

  '& .editor-list-ul': {
    padding: 0,
    margin: 0,
    marginLeft: '16px',
  },

  '& .editor-listitem': {
    margin: '8px 32px 8px 32px',
  },

  '& .editor-nested-listitem': {
    listStyleType: 'none',
  },

  '& .editor-textBold': {
    fontStyle: 'bold',
  },
  '& .editor-textItalic': {
    fontStyle: 'italic',
  },
  '& .editor-textStrikethrough': {
    textDecoration: 'line-through',
  },
  '& .editor-textUnderline': {
    textDecoration: 'underline',
  },
  '& .editor-textUnderlineStrikethrough': {
    textDecoration: 'underline line-through',
  },
  '& .editor-heading-h1': {
    fontSize: '24px',
    color: 'rgb(5, 5, 5)',
    fontWeight: 400,
    margin: 0,
    marginBottom: '12px',
    padding: 0,
  },
});

const innerStyles = css({
  background: '#fff',
  position: 'relative',
});
const inputStyles = {
  minHeight: '150px',
  fontSize: '15px',
  caretColor: 'rgb(5, 5, 5)',
  tabSize: 1,
  outline: 0,
  padding: '15px 10px',
};

const placeholderStyles = css({
  color: '#999',
  overflow: 'hidden',
  position: 'absolute',
  textOverflow: 'ellipsis',
  top: '15px',
  left: '10px',
  fontSize: '15px',
  userSelect: 'none',
  display: 'inline-block',
  pointerEvents: 'none',
});

const markdownStyles = css({
  fontSize: '1em',

  '& .editor-paragraph': {
    margin: 0,
    marginBottom: '16px',
    position: 'relative',
    '&:last-child': {
      marginBottom: 0,
    },
  },

  '& .editor-list-ol, & .editor-list-ul': {
    margin: '0 0 16px 16px',
    padding: 0,
  },

  '& .editor-listItem': {
    margin: '8px 0',
  },
});

const onChangeHandler = (
  editorState: EditorState,
  onChange: (content: string) => void,
) => editorState.read(() => onChange($convertToMarkdownString(TRANSFORMERS)));

export type TextEditorProps = {
  readonly customValidationMessage?: string;
  readonly getValidationMessage?: Parameters<typeof useValidation>[1];
  readonly id?: string;
  readonly required?: boolean;
  readonly maxLength?: number;
  readonly value: string;
  readonly enabled?: boolean;
  readonly isMarkdown?: boolean;
  readonly editorStyles?: SerializedStyles;
  readonly hasError?: boolean;
  readonly autofocus?: boolean;
  onChange?: (content: string) => void;
  onBlur?: () => void;
};

const EnablePlugin = ({ enabled }: { enabled: boolean }) => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.setEditable(enabled);
  }, [enabled, editor]);
  return <></>;
};

const applyLinkTarget = (node: LinkNode) => {
  if (node.getTarget() !== '_blank') {
    node.setTarget('_blank');
  }
  if (node.getRel() !== 'noopener noreferrer') {
    node.setRel('noopener noreferrer');
  }
};

const URL_REGEX =
  /(https?:\/\/[^\s]+|www\.[a-zA-Z0-9][a-zA-Z0-9-]*(?:\.[a-zA-Z0-9-]+)+[^\s]*)/;
const EMAIL_REGEX = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+)/;

export const autoLinkUrlToHref = (text: string): string =>
  text.startsWith('http') ? text : `https://${text}`;

export const autoLinkEmailToHref = (text: string): string => `mailto:${text}`;

const AUTO_LINK_MATCHERS = [
  createLinkMatcherWithRegExp(URL_REGEX, autoLinkUrlToHref),
  createLinkMatcherWithRegExp(EMAIL_REGEX, autoLinkEmailToHref),
];

const LinkTargetPlugin = () => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    const unregisterLink = editor.registerNodeTransform(LinkNode, (node) => {
      if ($isLinkNode(node)) applyLinkTarget(node);
    });
    const unregisterAutoLink = editor.registerNodeTransform(
      AutoLinkNode,
      (node) => {
        if ($isAutoLinkNode(node)) applyLinkTarget(node);
      },
    );
    // Apply to nodes already present from initial parse (transforms only fire
    // on dirty nodes, so we walk the current state once on mount).
    editor.update(() => {
      $nodesOfType(LinkNode).forEach(applyLinkTarget);
      $nodesOfType(AutoLinkNode).forEach(applyLinkTarget);
    });
    return () => {
      unregisterLink();
      unregisterAutoLink();
    };
  }, [editor]);
  return <></>;
};

const TextEditor = forwardRef<HTMLDivElement, TextEditorProps>(
  (
    {
      id,
      value,
      onChange,
      required,
      maxLength,
      customValidationMessage = '',
      enabled = true,
      getValidationMessage,
      isMarkdown = false,
      onBlur,
      editorStyles,
      hasError = false,
      autofocus = true,
    }: TextEditorProps,
    ref,
  ) => {
    const { validationMessage, validationTargetProps } =
      useValidation<HTMLTextAreaElement>(
        customValidationMessage,
        getValidationMessage,
        isMarkdown,
      );

    const initialConfig = {
      editorState: () => {
        $convertFromMarkdownString(value, TRANSFORMERS);
        $nodesOfType(LinkNode).forEach(applyLinkTarget);
      },
      namespace: 'Editor',
      nodes: [
        AutoLinkNode,
        LinkNode,
        ListNode,
        ListItemNode,
        HeadingNode,
        QuoteNode,
        CodeNode,
      ],
      theme,
      // eslint-disable-next-line no-console
      onError: console.error,
    };

    if (isMarkdown && !value) return <></>;

    return (
      <LexicalComposer initialConfig={initialConfig}>
        <div css={css([containerStyles, editorStyles])}>
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          {!isMarkdown && <ToolbarPlugin />}
          {onChange && (
            <OnChangePlugin
              onChange={(editorState) => onChangeHandler(editorState, onChange)}
            />
          )}
          <EnablePlugin enabled={enabled} />
          <div css={innerStyles}>
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  ref={ref}
                  id={id}
                  required={required}
                  data-testid={isMarkdown ? 'markdown-test-id' : 'editor'}
                  css={
                    !isMarkdown
                      ? [
                          styles,
                          inputStyles,
                          (validationMessage || hasError) && {
                            backgroundColor: colour.background.error,
                            borderColor: `${colour.border.error}!important`,
                          },
                          !enabled && {
                            color: colour.foreground.tertiary,
                            backgroundColor: colour.background.tertiary,
                          },
                        ]
                      : [markdownStyles]
                  }
                  onBlur={(e: React.FocusEvent) => {
                    validationTargetProps.onBlur(e);
                    onBlur?.();
                  }}
                />
              }
              placeholder={
                <div
                  css={[
                    placeholderStyles,
                    validationMessage && {
                      color: colour.foreground.error,
                      opacity: 0.4,
                    },
                  ]}
                >
                  Enter some text...
                </div>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
            {!isMarkdown && (
              <textarea
                {...validationTargetProps}
                onChange={noop}
                css={{ display: 'none' }}
                required={required}
                maxLength={maxLength}
                value={value}
              />
            )}
            <ListPlugin />
            <LinkPlugin />
            <AutoLinkPlugin matchers={AUTO_LINK_MATCHERS} />
            <LinkTargetPlugin />
            <HistoryPlugin />
            {autofocus && <AutoFocusPlugin />}
            <EditorRefPluginWrapper />
          </div>
        </div>
        <div css={validationMessageStyles}>{validationMessage}</div>
      </LexicalComposer>
    );
  },
);

export default TextEditor;
