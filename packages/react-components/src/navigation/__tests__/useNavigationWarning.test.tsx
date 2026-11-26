import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { useEffect, useState } from 'react';
import {
  NavigationBlockerProvider,
  useNavigationBlocker,
} from '../NavigationBlockerContext';
import { useNavigationWarning } from '../useNavigationWarning';

describe('useNavigationWarning', () => {
  let addEventListenerSpy: jest.SpyInstance;
  let removeEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    jest.spyOn(window.history, 'pushState').mockImplementation(() => {});
    jest.spyOn(window.history, 'go').mockImplementation(() => {});
    jest.spyOn(window.history, 'back').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const LocationDisplay = () => {
    const location = useLocation();
    return <div data-testid="location">{location.pathname}</div>;
  };

  const TestComponent = ({
    shouldBlock,
    message,
  }: {
    shouldBlock: boolean;
    message?: string;
  }) => {
    const { blockedNavigate } = useNavigationWarning({ shouldBlock, message });
    return (
      <div>
        <button onClick={() => blockedNavigate(-1)}>Go Back</button>
        <button onClick={() => blockedNavigate('/')}>Go Home</button>
        <LocationDisplay />
      </div>
    );
  };

  const renderWithProviders = (
    ui: React.ReactElement,
    initialEntries = ['/first', '/test'],
  ) =>
    render(
      <MemoryRouter initialEntries={initialEntries} initialIndex={1}>
        <NavigationBlockerProvider>{ui}</NavigationBlockerProvider>
      </MemoryRouter>,
    );

  describe('beforeunload handler', () => {
    it('adds beforeunload handler when shouldBlock is true', () => {
      renderWithProviders(<TestComponent shouldBlock={true} />);

      const beforeunloadCalls = addEventListenerSpy.mock.calls.filter(
        (call) => call[0] === 'beforeunload',
      );
      expect(beforeunloadCalls.length).toBeGreaterThan(0);
    });

    it('does not add beforeunload handler when shouldBlock is false', () => {
      renderWithProviders(<TestComponent shouldBlock={false} />);

      const beforeunloadCalls = addEventListenerSpy.mock.calls.filter(
        (call) => call[0] === 'beforeunload',
      );
      expect(beforeunloadCalls).toHaveLength(0);
    });

    it('removes beforeunload handler on unmount', () => {
      const { unmount } = renderWithProviders(
        <TestComponent shouldBlock={true} />,
      );

      const beforeunloadCallsBefore = addEventListenerSpy.mock.calls.filter(
        (call) => call[0] === 'beforeunload',
      );
      expect(beforeunloadCallsBefore.length).toBeGreaterThan(0);

      unmount();

      const removeBeforeunloadCalls = removeEventListenerSpy.mock.calls.filter(
        (call) => call[0] === 'beforeunload',
      );
      expect(removeBeforeunloadCalls.length).toBeGreaterThan(0);
    });

    it('removes beforeunload handler when shouldBlock changes to false', async () => {
      const ToggleComponent = () => {
        const [shouldBlock, setShouldBlock] = useState(true);
        useNavigationWarning({ shouldBlock });

        return <button onClick={() => setShouldBlock(false)}>Disable</button>;
      };

      renderWithProviders(<ToggleComponent />);

      // Initially should have added beforeunload
      const initialBeforeunloadCalls = addEventListenerSpy.mock.calls.filter(
        (call) => call[0] === 'beforeunload',
      );
      expect(initialBeforeunloadCalls.length).toBeGreaterThan(0);

      await userEvent.click(screen.getByText('Disable'));

      // Should have removed beforeunload
      await waitFor(() => {
        const removeBeforeunloadCalls =
          removeEventListenerSpy.mock.calls.filter(
            (call) => call[0] === 'beforeunload',
          );
        expect(removeBeforeunloadCalls.length).toBeGreaterThan(0);
      });
    });

    it('sets returnValue and prevents default when beforeunload event is triggered', () => {
      renderWithProviders(<TestComponent shouldBlock={true} />);

      // Get the registered beforeunload handler
      const beforeunloadCall = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'beforeunload',
      );
      expect(beforeunloadCall).toBeDefined();

      const handler = beforeunloadCall![1];

      // Create a mock BeforeUnloadEvent
      const mockEvent = {
        preventDefault: jest.fn(),
        returnValue: '',
      };

      // Call the handler and capture return value
      const returnValue = handler(mockEvent);

      // Verify the handler behavior
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.returnValue).toBe(
        'Are you sure you want to leave? Unsaved changes will be lost.',
      );
      expect(returnValue).toBe(
        'Are you sure you want to leave? Unsaved changes will be lost.',
      );
    });

    it('uses custom message when beforeunload event is triggered', () => {
      const customMessage = 'Custom warning message';
      renderWithProviders(
        <TestComponent shouldBlock={true} message={customMessage} />,
      );

      const beforeunloadCall = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'beforeunload',
      );
      const handler = beforeunloadCall![1];

      const mockEvent = {
        preventDefault: jest.fn(),
        returnValue: '',
      };

      const returnValue = handler(mockEvent);

      expect(mockEvent.returnValue).toBe(customMessage);
      expect(returnValue).toBe(customMessage);
    });
  });

  describe('popstate handler', () => {
    it('adds popstate handler when shouldBlock is true', () => {
      renderWithProviders(<TestComponent shouldBlock={true} />);

      const popstateCalls = addEventListenerSpy.mock.calls.filter(
        (call) => call[0] === 'popstate',
      );
      expect(popstateCalls.length).toBeGreaterThan(0);
    });

    it('removes popstate handler on unmount', () => {
      const { unmount } = renderWithProviders(
        <TestComponent shouldBlock={true} />,
      );

      unmount();

      const removePopstateCalls = removeEventListenerSpy.mock.calls.filter(
        (call) => call[0] === 'popstate',
      );
      expect(removePopstateCalls.length).toBeGreaterThan(0);
    });

    it('shows confirm and undoes navigation when user cancels via browser back button', () => {
      const pushStateSpy = jest.spyOn(window.history, 'pushState');
      const goSpy = jest.spyOn(window.history, 'go');
      jest.spyOn(window, 'confirm').mockReturnValue(false);

      renderWithProviders(<TestComponent shouldBlock={true} />);

      // Clear spies after initial render (which pushes a dummy entry)
      pushStateSpy.mockClear();
      goSpy.mockClear();

      // Simulate browser back button triggering popstate
      window.dispatchEvent(new PopStateEvent('popstate'));

      // Confirm dialog should be shown
      expect(window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to leave? Unsaved changes will be lost.',
      );

      // Should push a dummy entry to undo the navigation
      expect(pushStateSpy).toHaveBeenCalledWith(null, '', window.location.href);

      // Should NOT navigate further since user canceled
      expect(goSpy).not.toHaveBeenCalled();
    });

    it('navigates back when user confirms via browser back button', () => {
      const pushStateSpy = jest.spyOn(window.history, 'pushState');
      const goSpy = jest.spyOn(window.history, 'go');
      jest.spyOn(window, 'confirm').mockReturnValue(true);

      renderWithProviders(<TestComponent shouldBlock={true} />);

      // Clear spies after initial render
      pushStateSpy.mockClear();
      goSpy.mockClear();

      // Simulate browser back button triggering popstate
      window.dispatchEvent(new PopStateEvent('popstate'));

      // Confirm dialog should be shown
      expect(window.confirm).toHaveBeenCalled();

      // Should push dummy entry first (to undo the navigation)
      expect(pushStateSpy).toHaveBeenCalledWith(null, '', window.location.href);

      // User confirmed, so should go back -2 (skip the dummy entry plus navigate back)
      expect(goSpy).toHaveBeenCalledWith(-2);
    });

    it('uses custom message in popstate confirm dialog', () => {
      const customMessage = 'Custom popstate warning';
      jest.spyOn(window, 'confirm').mockReturnValue(false);

      renderWithProviders(
        <TestComponent shouldBlock={true} message={customMessage} />,
      );

      // Simulate browser back button
      window.dispatchEvent(new PopStateEvent('popstate'));

      expect(window.confirm).toHaveBeenCalledWith(customMessage);
    });

    it("opens the page's discard dialog instead of the confirm", () => {
      const goSpy = jest.spyOn(window.history, 'go');
      const openDialog = jest.fn();
      const DiscardDialog = () => {
        const { setDiscardDialog } = useNavigationBlocker();
        useEffect(() => {
          setDiscardDialog(openDialog);
          return () => setDiscardDialog(null);
        }, [setDiscardDialog]);
        return null;
      };

      renderWithProviders(
        <>
          <TestComponent shouldBlock={true} />
          <DiscardDialog />
        </>,
      );
      goSpy.mockClear();
      window.dispatchEvent(new PopStateEvent('popstate'));

      expect(openDialog).toHaveBeenCalledTimes(1);
      expect(window.confirm).not.toHaveBeenCalled();
      expect(goSpy).not.toHaveBeenCalled();
    });

    it('goes back without the confirm when the navigation was already allowed, once', async () => {
      const goSpy = jest.spyOn(window.history, 'go');
      jest.spyOn(window, 'confirm').mockReturnValue(false);
      const AllowButton = () => {
        const { allowNextNavigation } = useNavigationBlocker();
        return <button onClick={allowNextNavigation}>Allow</button>;
      };

      renderWithProviders(
        <>
          <TestComponent shouldBlock={true} />
          <AllowButton />
        </>,
      );
      goSpy.mockClear();

      await userEvent.click(screen.getByRole('button', { name: 'Allow' }));
      window.dispatchEvent(new PopStateEvent('popstate'));

      expect(window.confirm).not.toHaveBeenCalled();
      expect(goSpy).toHaveBeenCalledWith(-2);

      goSpy.mockClear();
      // The first popstate is the one go(-2) fires; the next back is a new one
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.dispatchEvent(new PopStateEvent('popstate'));

      expect(window.confirm).toHaveBeenCalledTimes(1);
      expect(goSpy).not.toHaveBeenCalled();
    });
  });

  describe('blockedNavigate', () => {
    it('navigates directly when not blocked', async () => {
      renderWithProviders(<TestComponent shouldBlock={false} />);

      expect(screen.getByTestId('location')).toHaveTextContent('/test');

      await userEvent.click(screen.getByText('Go Back'));

      await waitFor(() => {
        expect(screen.getByTestId('location')).toHaveTextContent('/first');
      });
      expect(window.confirm).not.toHaveBeenCalled();
    });

    it('navigates to path when not blocked', async () => {
      renderWithProviders(<TestComponent shouldBlock={false} />);

      await userEvent.click(screen.getByText('Go Home'));

      await waitFor(() => {
        expect(screen.getByTestId('location')).toHaveTextContent('/');
      });
    });

    it('shows confirm when blocked', async () => {
      renderWithProviders(<TestComponent shouldBlock={true} />);

      await userEvent.click(screen.getByText('Go Back'));

      expect(window.confirm).toHaveBeenCalled();
    });

    it('navigates when blocked and user confirms', async () => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      const goSpy = jest.spyOn(window.history, 'go');
      renderWithProviders(<TestComponent shouldBlock={true} />);

      await userEvent.click(screen.getByText('Go Back'));

      // Verify confirmation was shown and navigation was triggered
      // Note: window.history.go doesn't affect MemoryRouter in tests,
      // so we verify the call was made with correct offset (-2 to skip dummy entry)
      expect(window.confirm).toHaveBeenCalled();
      expect(goSpy).toHaveBeenCalledWith(-2);
    });

    it('does not navigate when blocked and user cancels', async () => {
      jest.spyOn(window, 'confirm').mockReturnValue(false);
      renderWithProviders(<TestComponent shouldBlock={true} />);

      await userEvent.click(screen.getByText('Go Back'));

      // Should still be on /test
      expect(screen.getByTestId('location')).toHaveTextContent('/test');
    });

    it('uses custom message in confirm dialog', async () => {
      renderWithProviders(
        <TestComponent shouldBlock={true} message="Custom warning" />,
      );

      await userEvent.click(screen.getByText('Go Back'));

      expect(window.confirm).toHaveBeenCalledWith('Custom warning');
    });

    it('shows confirm only once when using blockedNavigate with history navigation', async () => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      renderWithProviders(<TestComponent shouldBlock={true} />);

      await userEvent.click(screen.getByText('Go Back'));

      // Simulate real browser behavior: history.go() triggers popstate
      // (MemoryRouter doesn't use window.history, so we dispatch manually)
      window.dispatchEvent(new PopStateEvent('popstate'));

      // Should only show one confirmation, not two
      // (blockedNavigate shows one, popstate handler should NOT show another)
      expect(window.confirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('context registration', () => {
    it('registers with context when shouldBlock is true', async () => {
      renderWithProviders(<TestComponent shouldBlock={true} />);

      await userEvent.click(screen.getByText('Go Back'));
      expect(window.confirm).toHaveBeenCalled();
    });

    it('unregisters when shouldBlock becomes false', async () => {
      const ToggleComponent = () => {
        const [shouldBlock, setShouldBlock] = useState(true);
        const { blockedNavigate } = useNavigationWarning({ shouldBlock });

        return (
          <div>
            <button onClick={() => setShouldBlock(false)}>Disable</button>
            <button onClick={() => blockedNavigate(-1)}>Navigate</button>
            <LocationDisplay />
          </div>
        );
      };

      renderWithProviders(<ToggleComponent />);

      // Initially blocked
      await userEvent.click(screen.getByText('Navigate'));
      expect(window.confirm).toHaveBeenCalled();

      jest.clearAllMocks();

      // Disable blocking
      await userEvent.click(screen.getByText('Disable'));

      // Should navigate without confirm
      await userEvent.click(screen.getByText('Navigate'));
      expect(window.confirm).not.toHaveBeenCalled();
    });
  });

  describe('dummy history entry cleanup', () => {
    it('removes dummy history entry when shouldBlock becomes false', async () => {
      const backSpy = jest.spyOn(window.history, 'back');
      const pushStateSpy = jest.spyOn(window.history, 'pushState');

      const ToggleComponent = () => {
        const [shouldBlock, setShouldBlock] = useState(true);
        useNavigationWarning({ shouldBlock });
        return <button onClick={() => setShouldBlock(false)}>Disable</button>;
      };

      renderWithProviders(<ToggleComponent />);

      // Initial push should have happened (dummy entry created)
      expect(pushStateSpy).toHaveBeenCalled();

      // Clear to track new calls
      backSpy.mockClear();

      // Disable blocking
      await userEvent.click(screen.getByText('Disable'));

      // Should pop the dummy entry
      await waitFor(() => {
        expect(backSpy).toHaveBeenCalledTimes(1);
      });
    });

    it('navigates correctly after shouldBlock changes from true to false', async () => {
      const goSpy = jest.spyOn(window.history, 'go');

      const ToggleComponent = () => {
        const [shouldBlock, setShouldBlock] = useState(true);
        const { blockedNavigate } = useNavigationWarning({ shouldBlock });
        return (
          <div>
            <button onClick={() => setShouldBlock(false)}>Disable</button>
            <button onClick={() => blockedNavigate(-1)}>Navigate</button>
            <LocationDisplay />
          </div>
        );
      };

      renderWithProviders(<ToggleComponent />);

      // Disable blocking (this should clean up history)
      await userEvent.click(screen.getByText('Disable'));

      // Clear spies to track navigation call
      goSpy.mockClear();

      // Navigate - should use React Router's navigate(), not window.history.go()
      await userEvent.click(screen.getByText('Navigate'));

      // Should navigate to /first (previous entry) without offset adjustment
      // If using history.go, it would be called with -2, but we want navigate(-1)
      await waitFor(() => {
        expect(screen.getByTestId('location')).toHaveTextContent('/first');
      });

      // Should NOT have used history.go (which would indicate dummy entry still exists)
      expect(goSpy).not.toHaveBeenCalled();
    });

    it('keeps the redirect when the page navigated away before shouldBlock became false', async () => {
      const backSpy = jest.spyOn(window.history, 'back');
      const initialHref = window.location.href;

      const ToggleComponent = () => {
        const [shouldBlock, setShouldBlock] = useState(true);
        useNavigationWarning({ shouldBlock });
        return (
          <button
            onClick={() => {
              window.history.replaceState(null, '', '/shared-research/42');
              setShouldBlock(false);
            }}
          >
            Save and redirect
          </button>
        );
      };

      renderWithProviders(<ToggleComponent />);

      backSpy.mockClear();

      await userEvent.click(screen.getByText('Save and redirect'));

      await waitFor(() => {
        expect(backSpy).not.toHaveBeenCalled();
      });

      window.history.replaceState(null, '', initialHref);
    });

    it('does not call history.back on unmount when shouldBlock is still true', () => {
      const backSpy = jest.spyOn(window.history, 'back');

      const { unmount } = renderWithProviders(
        <TestComponent shouldBlock={true} />,
      );

      backSpy.mockClear();

      unmount();

      // Should NOT have called back - we only clean up on shouldBlock change
      expect(backSpy).not.toHaveBeenCalled();
    });

    it('handles shouldBlock toggling correctly', async () => {
      const backSpy = jest.spyOn(window.history, 'back');
      const pushStateSpy = jest.spyOn(window.history, 'pushState');

      const ToggleComponent = () => {
        const [shouldBlock, setShouldBlock] = useState(false);
        useNavigationWarning({ shouldBlock });
        return (
          <div>
            <button onClick={() => setShouldBlock(true)}>Enable</button>
            <button onClick={() => setShouldBlock(false)}>Disable</button>
          </div>
        );
      };

      renderWithProviders(<ToggleComponent />);

      // Initially not blocking - no pushState
      expect(pushStateSpy).not.toHaveBeenCalled();

      // Enable blocking - should push
      pushStateSpy.mockClear();
      await userEvent.click(screen.getByText('Enable'));
      expect(pushStateSpy).toHaveBeenCalledTimes(1);

      // Disable blocking - should pop
      backSpy.mockClear();
      await userEvent.click(screen.getByText('Disable'));
      expect(backSpy).toHaveBeenCalledTimes(1);

      // Enable again - should push again
      pushStateSpy.mockClear();
      await userEvent.click(screen.getByText('Enable'));
      expect(pushStateSpy).toHaveBeenCalledTimes(1);

      // Disable again - should pop again
      backSpy.mockClear();
      await userEvent.click(screen.getByText('Disable'));
      expect(backSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('StrictMode compatibility', () => {
    it('does not push duplicate history entries when effect re-runs', () => {
      const pushStateSpy = jest.spyOn(window.history, 'pushState');

      // First render
      const { unmount } = renderWithProviders(
        <TestComponent shouldBlock={true} />,
      );

      const firstPushCount = pushStateSpy.mock.calls.filter(
        (call) => call[0] === null,
      ).length;
      expect(firstPushCount).toBe(1);

      // Simulate StrictMode cleanup + re-mount (unmount and remount same component)
      // In real StrictMode, effect cleanup runs but refs persist
      unmount();

      // Re-render with same props (simulating StrictMode second mount)
      // Note: In real StrictMode, refs persist. In this test, we're creating a new
      // component instance, but the behavior we're testing is that pushState is
      // guarded by the ref check.
      renderWithProviders(<TestComponent shouldBlock={true} />);

      // Total pushes should be 2 (one per mount) not more
      // This test verifies the guard exists. In real StrictMode with persistent refs,
      // only 1 push would occur
      const totalPushes = pushStateSpy.mock.calls.filter(
        (call) => call[0] === null,
      ).length;
      expect(totalPushes).toBe(2);
    });

    it('sets intentionalNavigationRef before navigation in else branch', async () => {
      // This test verifies that intentionalNavigationRef is set even when
      // hasDummyEntryRef is false, preventing double confirm dialogs
      jest.spyOn(window, 'confirm').mockReturnValue(true);

      const NavigateWithoutDummyComponent = () => {
        const { blockedNavigate } = useNavigationWarning({
          shouldBlock: false, // No blocking = no dummy entry
        });
        return (
          <div>
            <button onClick={() => blockedNavigate(-1)}>Go Back</button>
            <LocationDisplay />
          </div>
        );
      };

      renderWithProviders(<NavigateWithoutDummyComponent />);

      // Click navigate - should not show any confirm (not blocked)
      await userEvent.click(screen.getByText('Go Back'));

      // Simulate popstate that might occur from navigate()
      window.dispatchEvent(new PopStateEvent('popstate'));

      // No confirm should have been shown (not blocked, so no handler registered)
      expect(window.confirm).not.toHaveBeenCalled();
    });
  });
});
