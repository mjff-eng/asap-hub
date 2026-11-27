/* istanbul ignore file */
// For TypeScript to understand the extended matcher
import '@emotion/jest';

export const textContentWithPseudo = (element: HTMLElement): string[] => {
  const texts = [];

  const [, beforeText] =
    getComputedStyle(element, '::before').content.match(/"(.+)"/) || [];
  if (beforeText) texts.push(beforeText);

  const { textContent } = element;
  if (textContent) texts.push(textContent);

  const [, afterText] =
    getComputedStyle(element, '::after').content.match(/"(.+)"/) || [];
  if (afterText) texts.push(afterText);

  return texts;
};

/**
 * Mocks console.error to suppress only React act() warnings while letting other errors through.
 * Use this for tests that trigger unavoidable act() warnings from async validation state updates.
 *
 * @returns Object with `mockRestore()` method to restore original console.error
 *
 * @example
 * // In individual test:
 * it('test name', async () => {
 *   const consoleMock = mockActErrorsInConsole();
 *   // ... test code ...
 *   consoleMock.mockRestore();
 * });
 *
 * @example
 * // In beforeEach/afterEach:
 * let consoleMock: ReturnType<typeof mockActErrorsInConsole>;
 * beforeEach(() => {
 *   consoleMock = mockActErrorsInConsole();
 * });
 * afterEach(() => {
 *   consoleMock.mockRestore();
 * });
 */
export const mockActErrorsInConsole = () => {
  // eslint-disable-next-line no-console
  const originalConsoleError = console.error;
  const spy = jest
    .spyOn(console, 'error')
    .mockImplementation((...args: unknown[]) => {
      const message = args[0]?.toString() || '';
      // Suppress various act() related warnings from React 18
      if (
        message.includes('not wrapped in act(') ||
        message.includes('not configured to support act(')
      ) {
        return; // Suppress act() warnings
      }
      originalConsoleError.apply(console, args); // Let other errors through
    });
  return spy;
};
