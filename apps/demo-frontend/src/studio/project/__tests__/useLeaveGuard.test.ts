import { act, renderHook } from '@testing-library/react';
import { useLeaveGuard } from '../useLeaveGuard';

describe('useLeaveGuard', () => {
  it('lets a departure straight through when nothing is unsaved', () => {
    const leave = jest.fn();
    const { result } = renderHook(() => useLeaveGuard(false));

    let allowed = false;
    act(() => {
      allowed = result.current.request(leave);
    });

    expect(allowed).toBe(true);
    expect(leave).toHaveBeenCalled();
    expect(result.current.asking).toBe(false);
  });

  it('holds a departure and asks when there are unsaved edits', () => {
    const leave = jest.fn();
    const { result } = renderHook(() => useLeaveGuard(true));

    let allowed = true;
    act(() => {
      allowed = result.current.request(leave);
    });

    expect(allowed).toBe(false);
    expect(leave).not.toHaveBeenCalled();
    expect(result.current.asking).toBe(true);
  });

  it('resumes the very navigation that was interrupted', () => {
    const leave = jest.fn();
    const { result } = renderHook(() => useLeaveGuard(true));

    act(() => {
      result.current.request(leave);
    });
    act(() => result.current.discard());

    expect(leave).toHaveBeenCalledTimes(1);
    expect(result.current.asking).toBe(false);
  });

  it('goes nowhere when the creator stays', () => {
    const leave = jest.fn();
    const { result } = renderHook(() => useLeaveGuard(true));

    act(() => {
      result.current.request(leave);
    });
    act(() => result.current.stay());

    expect(leave).not.toHaveBeenCalled();
    expect(result.current.asking).toBe(false);
  });
});
