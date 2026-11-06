/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { ButtonHTMLAttributes, FC, ReactNode } from 'react';
import { editorTheme } from './editorTheme';

const baseStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  height: 32,
  padding: '0 10px',
  borderRadius: 6,
  border: `1px solid ${editorTheme.line}`,
  backgroundColor: editorTheme.raised,
  color: editorTheme.text,
  font: 'inherit',
  fontSize: 13,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  ':hover:not(:disabled)': { borderColor: editorTheme.muted },
  ':disabled': { opacity: 0.4, cursor: 'not-allowed' },
});

const iconOnlyStyles = css({ width: 32, padding: 0 });

const primaryStyles = css({
  backgroundColor: editorTheme.playhead,
  borderColor: editorTheme.playhead,
  color: editorTheme.onAccent,
  fontWeight: 600,
});

const dangerStyles = css({
  backgroundColor: editorTheme.record,
  borderColor: editorTheme.record,
  color: editorTheme.onRecord,
  fontWeight: 600,
});

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly icon?: ReactNode;
  readonly primary?: boolean;
  readonly danger?: boolean;
};

// the editor chrome is dark and dense, so it does not reuse the page button
const EditorButton: FC<Props> = ({
  icon,
  primary,
  danger,
  children,
  ...props
}) => (
  <button
    type="button"
    css={[
      baseStyles,
      !children && iconOnlyStyles,
      primary && primaryStyles,
      danger && dangerStyles,
    ]}
    {...props}
  >
    {icon}
    {children}
  </button>
);

export default EditorButton;
