import { act, renderHook } from '@testing-library/react';
import { usePlayback, usePlaybackContext } from '../usePlayback';

// the clock runs on animation frames, so the test holds them and steps them
// one at a time with a timestamp of its choosing
const scheduled = new Map<number, FrameRequestCallback>();

beforeEach(() => {
  let nextId = 0;
  scheduled.clear();
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((run) => {
    nextId += 1;
    scheduled.set(nextId, run);
    return nextId;
  });
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    scheduled.delete(id);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

const runFrame = (now: number): boolean => {
  const pending = Array.from(scheduled.entries()).pop();
  if (!pending) return false;
  scheduled.delete(pending[0]);
  act(() => pending[1](now));
  return true;
};

describe('the playhead', () => {
  it('starts at zero and stopped', () => {
    const { result } = renderHook(() => usePlayback({ durationMs: 1000 }));

    expect(result.current.playing).toBe(false);
    expect(result.current.getPlayheadMs()).toBe(0);
  });

  it('seeks to a whole millisecond inside the programme', () => {
    const { result } = renderHook(() => usePlayback({ durationMs: 1000 }));

    act(() => result.current.seek(250.6));
    expect(result.current.getPlayheadMs()).toBe(251);

    act(() => result.current.seek(-50));
    expect(result.current.getPlayheadMs()).toBe(0);

    act(() => result.current.seek(5000));
    expect(result.current.getPlayheadMs()).toBe(1000);
  });

  it('nudges from where it stands and stops at either end', () => {
    const { result } = renderHook(() => usePlayback({ durationMs: 1000 }));

    act(() => result.current.seek(500));
    act(() => result.current.nudge(-200));
    expect(result.current.getPlayheadMs()).toBe(300);

    act(() => result.current.nudge(10000));
    expect(result.current.getPlayheadMs()).toBe(1000);
  });

  it('tells each subscriber where it moved, once per move', () => {
    const { result } = renderHook(() => usePlayback({ durationMs: 1000 }));
    const heard: number[] = [];
    const unsubscribe = result.current.subscribe((ms) => heard.push(ms));

    act(() => result.current.seek(400));
    act(() => result.current.seek(400));
    act(() => result.current.nudge(100));
    unsubscribe();
    act(() => result.current.seek(900));

    expect(heard).toEqual([400, 500]);
  });

  it('is pulled back when the programme gets shorter than where it stands', () => {
    const { result, rerender } = renderHook(
      ({ durationMs }) => usePlayback({ durationMs }),
      { initialProps: { durationMs: 1000 } },
    );
    const heard: number[] = [];
    result.current.subscribe((ms) => heard.push(ms));

    act(() => result.current.seek(900));
    rerender({ durationMs: 600 });

    expect(result.current.getPlayheadMs()).toBe(600);
    expect(heard).toEqual([900, 600]);
  });
});

describe('playing', () => {
  it('does not start on an empty programme', () => {
    const { result } = renderHook(() => usePlayback({ durationMs: 0 }));

    act(() => result.current.play());
    expect(result.current.playing).toBe(false);

    act(() => result.current.toggle());
    expect(result.current.playing).toBe(false);
  });

  it('toggles between playing and paused', () => {
    const { result } = renderHook(() => usePlayback({ durationMs: 1000 }));

    act(() => result.current.toggle());
    expect(result.current.playing).toBe(true);

    act(() => result.current.toggle());
    expect(result.current.playing).toBe(false);
  });

  it('moves the playhead by the time between frames', () => {
    const { result } = renderHook(() => usePlayback({ durationMs: 1000 }));

    act(() => result.current.play());
    runFrame(100);
    expect(result.current.getPlayheadMs()).toBe(0);

    runFrame(400);
    expect(result.current.getPlayheadMs()).toBe(300);
  });

  it('stops on the last frame and says the programme ended', () => {
    const onEnd = jest.fn();
    const { result } = renderHook(() =>
      usePlayback({ durationMs: 1000, onEnd }),
    );

    act(() => result.current.play());
    runFrame(0);
    runFrame(700);
    runFrame(1500);

    expect(result.current.getPlayheadMs()).toBe(1000);
    expect(result.current.playing).toBe(false);
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(scheduled.size).toBe(0);
  });

  it('stops asking for frames when paused', () => {
    const { result } = renderHook(() => usePlayback({ durationMs: 1000 }));

    act(() => result.current.play());
    runFrame(0);
    runFrame(250);
    act(() => result.current.pause());

    expect(scheduled.size).toBe(0);
    expect(result.current.getPlayheadMs()).toBe(250);
  });

  // the first frame after a resume counts from itself, so the time spent
  // paused is not added to the playhead all at once
  it('resumes from where it paused rather than jumping ahead', () => {
    const { result } = renderHook(() => usePlayback({ durationMs: 1000 }));

    act(() => result.current.play());
    runFrame(0);
    runFrame(200);
    act(() => result.current.pause());
    act(() => result.current.play());
    runFrame(5000);
    expect(result.current.getPlayheadMs()).toBe(200);

    runFrame(5100);
    expect(result.current.getPlayheadMs()).toBe(300);
  });
});

describe('a stage rendered without the editor around it', () => {
  it('has a playhead that stays at the start whatever it is asked', () => {
    const { result } = renderHook(() => usePlaybackContext());
    const heard: number[] = [];
    const unsubscribe = result.current.subscribe((ms) => heard.push(ms));

    act(() => {
      result.current.play();
      result.current.toggle();
      result.current.seek(500);
      result.current.nudge(100);
      result.current.pause();
    });
    unsubscribe();

    expect(result.current.playing).toBe(false);
    expect(result.current.getPlayheadMs()).toBe(0);
    expect(heard).toEqual([]);
  });
});
