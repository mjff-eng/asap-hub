import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useState } from 'react';
import {
  NavigationBlockerProvider,
  useNavigationBlocker,
} from '../NavigationBlockerContext';

describe('NavigationBlockerContext', () => {
  beforeEach(() => {
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children', () => {
    render(
      <NavigationBlockerProvider>
        <div>Test Child</div>
      </NavigationBlockerProvider>,
    );

    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('isBlocked is false by default', () => {
    const TestComponent = () => {
      const { isBlocked } = useNavigationBlocker();
      return <div data-testid="blocked">{isBlocked.toString()}</div>;
    };

    render(
      <NavigationBlockerProvider>
        <TestComponent />
      </NavigationBlockerProvider>,
    );

    expect(screen.getByTestId('blocked')).toHaveTextContent('false');
  });

  it('register adds blocker and returns cleanup function', async () => {
    const TestComponent = () => {
      const { register, isBlocked } = useNavigationBlocker();
      const [cleanup, setCleanup] = useState<(() => void) | null>(null);

      return (
        <div>
          <div data-testid="blocked">{isBlocked.toString()}</div>
          <button onClick={() => setCleanup(() => register('Test message'))}>
            Register
          </button>
          <button onClick={() => cleanup?.()}>Cleanup</button>
        </div>
      );
    };

    render(
      <NavigationBlockerProvider>
        <TestComponent />
      </NavigationBlockerProvider>,
    );

    expect(screen.getByTestId('blocked')).toHaveTextContent('false');

    await userEvent.click(screen.getByText('Register'));
    expect(screen.getByTestId('blocked')).toHaveTextContent('true');

    await userEvent.click(screen.getByText('Cleanup'));
    expect(screen.getByTestId('blocked')).toHaveTextContent('false');
  });

  it('requestNavigation returns true when not blocked', async () => {
    const TestComponent = () => {
      const { requestNavigation } = useNavigationBlocker();
      const [result, setResult] = useState<boolean | null>(null);

      return (
        <div>
          <div data-testid="result">{result?.toString() ?? 'null'}</div>
          <button onClick={() => setResult(requestNavigation())}>
            Request Navigation
          </button>
        </div>
      );
    };

    render(
      <NavigationBlockerProvider>
        <TestComponent />
      </NavigationBlockerProvider>,
    );

    await userEvent.click(screen.getByText('Request Navigation'));
    expect(screen.getByTestId('result')).toHaveTextContent('true');
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('requestNavigation shows confirm and returns user choice when blocked', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(false);

    const TestComponent = () => {
      const { register, requestNavigation } = useNavigationBlocker();
      const [result, setResult] = useState<boolean | null>(null);

      useEffect(() => {
        const cleanup = register('Custom message');
        return cleanup;
      }, [register]);

      return (
        <div>
          <div data-testid="result">{result?.toString() ?? 'null'}</div>
          <button onClick={() => setResult(requestNavigation())}>
            Request Navigation
          </button>
        </div>
      );
    };

    render(
      <NavigationBlockerProvider>
        <TestComponent />
      </NavigationBlockerProvider>,
    );

    await userEvent.click(screen.getByText('Request Navigation'));
    expect(window.confirm).toHaveBeenCalledWith('Custom message');
    expect(screen.getByTestId('result')).toHaveTextContent('false');
  });

  it('works without provider (returns safe defaults)', async () => {
    const TestComponent = () => {
      const { isBlocked, requestNavigation } = useNavigationBlocker();
      const [result, setResult] = useState<boolean | null>(null);

      return (
        <div>
          <div data-testid="blocked">{isBlocked.toString()}</div>
          <div data-testid="result">{result?.toString() ?? 'null'}</div>
          <button onClick={() => setResult(requestNavigation())}>
            Request Navigation
          </button>
        </div>
      );
    };

    render(<TestComponent />);

    expect(screen.getByTestId('blocked')).toHaveTextContent('false');
    await userEvent.click(screen.getByText('Request Navigation'));
    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('true');
    });
  });

  it('provides default message when registered without custom message', () => {
    const TestComponent = () => {
      const { register, message, isBlocked } = useNavigationBlocker();

      useEffect(() => {
        const cleanup = register();
        return cleanup;
      }, [register]);

      return (
        <div>
          <div data-testid="blocked">{isBlocked.toString()}</div>
          <div data-testid="message">{message}</div>
        </div>
      );
    };

    render(
      <NavigationBlockerProvider>
        <TestComponent />
      </NavigationBlockerProvider>,
    );

    expect(screen.getByTestId('blocked')).toHaveTextContent('true');
    expect(screen.getByTestId('message')).toHaveTextContent(
      'Are you sure you want to leave? Unsaved changes will be lost.',
    );
  });

  const AllowedNavigation = () => {
    const { allowNextNavigation, consumeAllowedNavigation } =
      useNavigationBlocker();
    const [results, setResults] = useState<boolean[]>([]);
    return (
      <div>
        <button onClick={allowNextNavigation}>Allow</button>
        <button
          onClick={() =>
            setResults((prev) => [...prev, consumeAllowedNavigation()])
          }
        >
          Consume
        </button>
        <div data-testid="results">{results.join(',')}</div>
      </div>
    );
  };

  it('never allows a navigation without a provider', async () => {
    render(<AllowedNavigation />);

    await userEvent.click(screen.getByText('Allow'));
    await userEvent.click(screen.getByText('Consume'));

    expect(screen.getByTestId('results')).toHaveTextContent('false');
  });
});
