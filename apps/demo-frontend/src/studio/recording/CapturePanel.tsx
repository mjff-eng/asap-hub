/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FC, useState } from 'react';
import { RecordingSession, RecordingSessionStatus } from '../../api/types';
import EditorButton from '../editor/EditorButton';
import { editorTheme } from '../editor/editorTheme';
import { PlusIcon } from '../editor/icons';

const panelStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: 10,
  borderRadius: 8,
  border: `1px solid ${editorTheme.line}`,
  backgroundColor: editorTheme.raised,
});

const hintStyles = css({
  margin: 0,
  fontSize: 12,
  color: editorTheme.muted,
  lineHeight: 1.5,
});

const snippetStyles = css({
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 11,
  color: editorTheme.text,
  backgroundColor: editorTheme.surface,
  border: `1px solid ${editorTheme.line}`,
  borderRadius: 6,
  padding: 8,
  width: '100%',
  boxSizing: 'border-box',
  resize: 'vertical',
});

const tabsStyles = css({ display: 'flex', gap: 4, flexWrap: 'wrap' });

const liveStyles = css({
  fontSize: 12,
  color: editorTheme.audio,
  fontWeight: 600,
});

const waitingStyles = css({ fontSize: 12, color: editorTheme.muted });

type Method = 'bookmarklet' | 'console' | 'script';

const methods: { id: Method; label: string }[] = [
  { id: 'bookmarklet', label: 'Bookmark' },
  { id: 'console', label: 'Console' },
  { id: 'script', label: 'Script tag' },
];

// Capturing clicks means running code in the page being demoed, but nothing
// says that code has to live in its HTML: a bookmark or one line pasted into
// the console loads the same file for one visit and leaves no trace.
const loader = (snippetUrl: string): Record<Method, string> => ({
  bookmarklet:
    // eslint-disable-next-line no-script-url -- a bookmarklet address is literally a javascript: URL
    `javascript:(function(){var s=document.createElement('script');` +
    `s.src='${snippetUrl}';document.body.appendChild(s);})();`,
  console:
    `var s=document.createElement('script');` +
    `s.src='${snippetUrl}';document.body.appendChild(s);`,
  script: `<script src="${snippetUrl}"></script>`,
});

const instructions: Record<Method, string> = {
  bookmarklet:
    'Make a new bookmark and paste this as its address. You only ever do this once: it belongs to this project, not to this recording, so every later take uses the same bookmark. On the site you are demoing, click it once. Nothing is added to the site itself.',
  console:
    'Open the developer console on the site you are demoing and paste this in. It lasts until the page is reloaded, and changes nothing on the site.',
  script:
    'For a site you control: paste this into the page. Each tab reports separately and they are merged in time order.',
};

type Props = {
  readonly session?: RecordingSession;
  readonly status?: RecordingSessionStatus;
  readonly readOnly: boolean;
  // a closed capture whose events nobody has read is the one state no fresh
  // capture is started for, because starting one loses the take it still holds
  readonly unreadEvents?: boolean;
  readonly onStart: () => void;
  readonly onNewBookmark: () => void;
  readonly onApply: () => void;
  readonly applying: boolean;
  readonly error?: string;
};

const errorStyles = css({ fontSize: 12, color: editorTheme.record, margin: 0 });

const quietAfterMs = 60_000;

const CapturePanel: FC<Props> = ({
  session,
  status,
  readOnly,
  unreadEvents = false,
  onStart,
  onNewBookmark,
  onApply,
  applying,
  error,
}) => {
  const [method, setMethod] = useState<Method>('bookmarklet');
  const [copied, setCopied] = useState(false);

  if (!session) {
    return (
      <div css={panelStyles}>
        <p css={hintStyles}>
          Track the mouse on the site you are demoing, so clicks become
          highlights and zooms you can edit afterwards. The bookmark that does
          it is set up once and reused by every recording of this project.
        </p>
        <EditorButton
          icon={<PlusIcon size={15} />}
          disabled={readOnly}
          onClick={onStart}
        >
          Track the cursor
        </EditorButton>
      </div>
    );
  }

  const text = session.snippetUrl ? loader(session.snippetUrl)[method] : '';
  const finished = Boolean(status) && status?.state !== 'open';
  const quietForMs =
    status?.state === 'open' && status.eventCount > 0 && status.lastEventAt
      ? Math.max(0, Date.now() - Date.parse(status.lastEventAt))
      : undefined;

  return (
    <div css={panelStyles}>
      {session.snippetUrl ? (
        <>
          <p css={hintStyles}>
            Save this once. It belongs to the project, so the same bookmark
            keeps working for every recording you make from now on.
          </p>
          <div
            css={tabsStyles}
            role="group"
            aria-label="How to load the capture"
          >
            {methods.map(({ id, label }) => (
              <EditorButton
                key={id}
                primary={id === method}
                onClick={() => {
                  setMethod(id);
                  setCopied(false);
                }}
              >
                {label}
              </EditorButton>
            ))}
          </div>

          <p css={hintStyles}>{instructions[method]}</p>
          <textarea
            css={snippetStyles}
            readOnly
            rows={3}
            value={text}
            aria-label="Capture snippet"
            onFocus={(event) => event.target.select()}
          />
          <EditorButton
            onClick={() => {
              void navigator.clipboard
                ?.writeText(text)
                .then(() => setCopied(true))
                .catch(() => setCopied(false));
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </EditorButton>
        </>
      ) : (
        <>
          <p css={hintStyles}>
            This project already has a capture bookmark, and it works for this
            recording too. Click it on the tab you are demoing; there is nothing
            new to copy.
          </p>
          <EditorButton disabled={readOnly} onClick={onNewBookmark}>
            Show a new bookmark
          </EditorButton>
          <p css={hintStyles}>
            Only if you lost it: a new bookmark replaces the one you saved
            before, which stops sending.
          </p>
        </>
      )}

      {status && status.eventCount > 0 ? (
        <span css={liveStyles}>
          {`${status.clientCount} ${
            status.clientCount === 1 ? 'tab' : 'tabs'
          } connected, ${status.eventCount} events`}
        </span>
      ) : (
        <span css={waitingStyles}>
          Waiting for the first events… Click your capture bookmark on the tab
          you are demoing.
        </span>
      )}

      {/* every silent death of the reporter, a reloaded demo tab, a replaced
          bookmark, a full quota, shows up as this number freezing; a frozen
          number reads as fine unless something says how stale it is */}
      {quietForMs !== undefined && quietForMs > quietAfterMs ? (
        <span css={waitingStyles}>
          {`Nothing has arrived for ${Math.round(
            quietForMs / 60000,
          )} min. Click your capture bookmark again on the tab you are demoing; if it was clicked and this stays quiet, the capture is full, so add the cursor effects and record on.`}
        </span>
      ) : null}

      <EditorButton
        primary
        disabled={readOnly || applying || !status || status.eventCount === 0}
        onClick={onApply}
      >
        {applying ? 'Adding effects…' : 'Add cursor effects'}
      </EditorButton>

      {/* a capture stops the moment its effects are taken, so the next take
          needs one of its own; recording again starts one by itself, and this
          button covers capturing without recording */}
      {finished ? (
        <>
          <p css={hintStyles}>
            {unreadEvents
              ? 'This capture is closed and its events have not been read yet. Add cursor effects brings them in; tracking the cursor again starts an empty capture and leaves them behind.'
              : 'This capture has been used. A fresh one starts by itself while this page is open.'}
          </p>
          <EditorButton
            icon={<PlusIcon size={15} />}
            disabled={readOnly}
            onClick={onStart}
          >
            Track the cursor again
          </EditorButton>
        </>
      ) : null}
      {error ? (
        <p css={errorStyles} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
};

export default CapturePanel;
