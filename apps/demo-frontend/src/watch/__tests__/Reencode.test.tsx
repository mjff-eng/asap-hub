import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ApiError } from '../../api/client';
import { adminMe, makeVideo, renderApp } from '../../test-utils';
import { ReencodeButton, ReencodeStatus } from '../Reencode';

const startWith = async (reencodeVideo: () => Promise<unknown>) => {
  renderApp(<ReencodeButton video={makeVideo()} />, {
    api: { reencodeVideo } as never,
    me: adminMe,
  });

  await userEvent.click(screen.getByRole('button', { name: 'Re-encode' }));
  await userEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Re-encode',
    }),
  );
  return screen.findByRole('alert');
};

describe('when a re-encode cannot start', () => {
  it.each([
    [
      'one is already running',
      'reencode_active',
      'A re-encode is already running.',
    ],
    [
      'the first encode is unfinished',
      'processing',
      'The first encode has not finished yet.',
    ],
  ])('says so when %s', async (_label, code, message) => {
    const alert = await startWith(() =>
      Promise.reject(new ApiError(409, 'conflict', code)),
    );

    expect(alert).toHaveTextContent(message);
  });

  it.each([
    ['an unknown refusal', new ApiError(409, 'conflict', 'something_new')],
    ['a network failure', new TypeError('Failed to fetch')],
  ])('asks to try again later after %s', async (_label, failure) => {
    const alert = await startWith(() => Promise.reject(failure));

    expect(alert).toHaveTextContent(
      'The re-encode could not be started. Try again in a minute.',
    );
  });
});

it('closes the confirmation on Escape without starting', async () => {
  const reencodeVideo = jest.fn();
  renderApp(<ReencodeButton video={makeVideo()} />, {
    api: { reencodeVideo } as never,
    me: adminMe,
  });

  await userEvent.click(screen.getByRole('button', { name: 'Re-encode' }));
  await userEvent.keyboard('{Escape}');

  expect(screen.queryByRole('dialog')).toBeNull();
  expect(reencodeVideo).not.toHaveBeenCalled();
});

describe('ReencodeStatus', () => {
  it('reports a running re-encode without naming who started it', () => {
    renderApp(
      <ReencodeStatus
        video={makeVideo({
          reencode: {
            reencodeId: 'r1',
            state: 'queued',
            source: 'original',
            requestedAt: '2026-10-12T15:00:00.000Z',
          },
        })}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      /^Re-encoding\. Viewers keep the current version/,
    );
  });

  it('reports a failure that carries no detail', () => {
    renderApp(
      <ReencodeStatus
        video={makeVideo({
          reencode: {
            reencodeId: 'r1',
            state: 'failed',
            source: 'stream',
            requestedAt: '2026-10-12T15:00:00.000Z',
          },
        })}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'The last re-encode failed.',
    );
  });

  it('says nothing when no re-encode was ever asked for', () => {
    renderApp(<ReencodeStatus video={makeVideo()} />);

    expect(screen.queryByRole('status')).toBeNull();
  });
});
