import { renderTookLabel, stageLabel } from '../RenderBar';

describe('stageLabel', () => {
  // the container reports these verbatim, so a label the encoder never sends
  // would leave every render showing the fallback
  it('names the stages the encoder reports', () => {
    expect(stageLabel('sources')).toBe('Fetching the sources');
    expect(stageLabel('sprite')).toBe('Building the preview images');
    expect(stageLabel('upload')).toBe('Uploading the demo');
  });

  it('reads the per step labels the plan produces', () => {
    expect(stageLabel('clip 0 (source asset-1)')).toBe('Rendering the clips');
    expect(stageLabel('join 3 clips (concat)')).toBe('Joining the timeline');
    expect(stageLabel('join 1 clip (xfade)')).toBe('Joining the timeline');
  });

  // a segmented join spends most of its time in the steps that write the
  // pieces, and those used to leave the bar reading the bare fallback
  it('reads the pieces a segmented join is assembled from as the join', () => {
    expect(stageLabel('assemble clip 0 from 4 tiles')).toBe(
      'Joining the timeline',
    );
    expect(stageLabel('cut clip 1 for the join')).toBe('Joining the timeline');
    expect(stageLabel('blend clip 0 into clip 1')).toBe('Joining the timeline');
    expect(stageLabel('join 2 clips (segments)')).toBe('Joining the timeline');
  });

  it('falls back for anything it does not know', () => {
    expect(stageLabel('something new')).toBe('Rendering');
  });
});

describe('renderTookLabel', () => {
  const done = {
    renderId: 'r1',
    state: 'done' as const,
    timelineVersion: 1,
    requestedAt: '2026-08-30T19:24:24.677Z',
    finishedAt: '2026-08-30T19:29:38.342Z',
  };

  it('reads the wall time off the row timestamps', () => {
    expect(renderTookLabel(done)).toBe('Exported in 5:14.');
  });

  it('speaks of the cut when the render was a download', () => {
    expect(renderTookLabel({ ...done, purpose: 'download' })).toBe(
      'Cut ready in 5:14.',
    );
  });

  it('shows nothing without both timestamps or before the render is done', () => {
    expect(renderTookLabel(undefined)).toBeUndefined();
    expect(renderTookLabel({ ...done, finishedAt: undefined })).toBeUndefined();
    expect(renderTookLabel({ ...done, state: 'failed' })).toBeUndefined();
    expect(
      renderTookLabel({ ...done, finishedAt: 'not a date' }),
    ).toBeUndefined();
  });
});
