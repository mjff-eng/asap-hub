/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FC, useState } from 'react';

import { ApiError } from '../api/client';
import { useReencodeVideo } from '../api/hooks';
import type { Video } from '../api/types';
import { Button, Modal } from '../ui/components';
import { charcoal, ember, lead, rem } from '../ui/theme';

const titleStyles = css({
  margin: 0,
  fontSize: rem(18),
  fontWeight: 'bold',
  color: charcoal.rgb,
});

const bodyStyles = css({
  margin: `${rem(12)} 0 0`,
  fontSize: rem(15),
  lineHeight: 1.5,
  color: charcoal.rgb,
});

const actionsStyles = css({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: rem(12),
  marginTop: rem(24),
});

const statusStyles = css({
  margin: `${rem(8)} 0 0`,
  fontSize: rem(14),
  color: lead.rgb,
});

const failedStyles = css({ color: ember.rgb });

const startErrorMessage = (error: unknown): string => {
  const code = error instanceof ApiError ? error.code : undefined;
  if (code === 'reencode_active') return 'A re-encode is already running.';
  if (code === 'processing') return 'The first encode has not finished yet.';
  if (code === 'no_source') {
    return 'There is no copy of this video left to re-encode.';
  }
  return 'The re-encode could not be started. Try again in a minute.';
};

export const canReencode = (video: Video): boolean =>
  video.kind === 'upload' &&
  (video.processingState === 'ready' || video.processingState === 'failed');

export const ReencodeButton: FC<{ readonly video: Video }> = ({ video }) => {
  const [confirming, setConfirming] = useState(false);
  const reencode = useReencodeVideo(video.id);
  const running = video.reencode?.state === 'queued';

  return (
    <>
      <Button
        small
        disabled={running || reencode.isPending}
        onClick={() => setConfirming(true)}
      >
        {running ? 'Re-encoding' : 'Re-encode'}
      </Button>
      {confirming && (
        <Modal label="Re-encode this demo" onClose={() => setConfirming(false)}>
          <h2 css={titleStyles}>Re-encode this demo?</h2>
          <p css={bodyStyles}>
            The video is encoded again as standard H.264, which every browser
            can play. It takes a few minutes. Anyone watching keeps the current
            version, and the new one is used from the next time the demo is
            opened.
          </p>
          <div css={actionsStyles}>
            <Button onClick={() => setConfirming(false)}>Cancel</Button>
            <Button
              primary
              onClick={() => {
                setConfirming(false);
                reencode.mutate();
              }}
            >
              Re-encode
            </Button>
          </div>
        </Modal>
      )}
      {reencode.isError && (
        <span css={[statusStyles, failedStyles]} role="alert">
          {startErrorMessage(reencode.error)}
        </span>
      )}
    </>
  );
};

export const ReencodeStatus: FC<{ readonly video: Video }> = ({ video }) => {
  const job = video.reencode;
  if (job?.state === 'queued') {
    return (
      <p css={statusStyles} role="status">
        Re-encoding
        {job.requestedByName ? `, started by ${job.requestedByName}` : ''}.
        Viewers keep the current version until it finishes.
      </p>
    );
  }
  if (job?.state === 'failed') {
    return (
      <p css={[statusStyles, failedStyles]} role="status">
        The last re-encode failed{job.error ? `: ${job.error}` : '.'}
      </p>
    );
  }
  return null;
};
