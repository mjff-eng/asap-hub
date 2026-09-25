import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { ComponentProps } from 'react';
import ExpandableText from '../ExpandableText';

describe('ExpandableText', () => {
  const text = 'this is a text';
  it('renders the children', () => {
    render(<ExpandableText>{text}</ExpandableText>);
    expect(screen.getByText(text)).toBeVisible();
  });
  it('renders show more if text height is larger than max height', async () => {
    const ref = { current: { scrollHeight: 125 } };

    Object.defineProperty(ref, 'current', {
      set(_current) {
        this.mockedCurrent = _current;
      },
      get() {
        return { scrollHeight: 125 };
      },
    });
    jest.spyOn(React, 'useRef').mockReturnValue(ref);

    render(<ExpandableText>{text}</ExpandableText>);
    const button = screen.getByRole('button');
    expect(button).toBeVisible();
    expect(button.textContent).toMatchInlineSnapshot(`"Show moreChevron Down"`);
    await userEvent.click(button);
    expect(button.textContent).toMatchInlineSnapshot(`"Show lessChevron Down"`);
  });

  it('renders show more with arrow variant', async () => {
    const ref = { current: { scrollHeight: 125 } };

    Object.defineProperty(ref, 'current', {
      set(_current) {
        this.mockedCurrent = _current;
      },
      get() {
        return { scrollHeight: 125 };
      },
    });
    jest.spyOn(React, 'useRef').mockReturnValue(ref);

    render(<ExpandableText variant="arrow">{text}</ExpandableText>);
    const button = screen.getByRole('button');
    expect(button).toBeVisible();
    expect(button.textContent).toMatchInlineSnapshot(`"Show more ↓"`);
    await userEvent.click(button);
    expect(button.textContent).toMatchInlineSnapshot(`"Show less ↑"`);
  });

  describe('expandOnce', () => {
    const renderExpanded = async (
      overrideProps?: ComponentProps<typeof ExpandableText>,
    ) => {
      const ref = { current: { scrollHeight: 125 } };

      Object.defineProperty(ref, 'current', {
        set(_current) {
          this.mockedCurrent = _current;
        },
        get() {
          return { scrollHeight: 125 };
        },
      });
      jest.spyOn(React, 'useRef').mockReturnValue(ref);

      render(<ExpandableText {...overrideProps}>{text}</ExpandableText>);
      const button = screen.getByRole('button');
      expect(button).toBeVisible();
      expect(button.textContent).toMatchInlineSnapshot(
        `"Show moreChevron Down"`,
      );
      await userEvent.click(button);
    };
    it('renders show less when expanded if expandOnce is not passed', async () => {
      await renderExpanded();
      expect(screen.queryByText(/less/i)).toBeInTheDocument();
    });

    it('renders show less when expanded if expandOnce is false', async () => {
      await renderExpanded({ expandOnce: false });
      expect(screen.queryByText(/less/i)).toBeInTheDocument();
    });

    it('does not render show less when expanded if expandOnce is true', async () => {
      await renderExpanded({ expandOnce: true });
      expect(screen.queryByText(/less/i)).not.toBeInTheDocument();
    });
  });

  it('does not render show more if the element is not available', () => {
    const ref = { current: null };
    Object.defineProperty(ref, 'current', {
      set() {},
      get() {
        return null;
      },
    });
    jest.spyOn(React, 'useRef').mockReturnValue(ref);

    render(<ExpandableText>{text}</ExpandableText>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  describe('when the size changes', () => {
    let scrollHeight: number;
    let resizeCallback: ResizeObserverCallback;
    const observe = jest.fn();
    const disconnect = jest.fn();

    beforeEach(() => {
      jest.restoreAllMocks();
      observe.mockClear();
      disconnect.mockClear();
      scrollHeight = 0;
      jest
        .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
        .mockImplementation(() => scrollHeight);
      globalThis.ResizeObserver = jest.fn((callback) => {
        resizeCallback = callback;
        return { observe, disconnect, unobserve: jest.fn() };
      }) as unknown as typeof ResizeObserver;
    });

    afterEach(() => {
      delete (globalThis as Partial<typeof globalThis>).ResizeObserver;
    });

    it('renders show more when hidden content becomes taller than max height', () => {
      render(<ExpandableText>{text}</ExpandableText>);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(observe).toHaveBeenCalledTimes(1);

      scrollHeight = 125;
      act(() => resizeCallback([], {} as ResizeObserver));

      expect(screen.getByRole('button')).toBeVisible();
    });

    it('hides show more when the content fits after a resize', () => {
      scrollHeight = 125;
      render(<ExpandableText>{text}</ExpandableText>);
      expect(screen.getByRole('button')).toBeVisible();

      scrollHeight = 100;
      act(() => resizeCallback([], {} as ResizeObserver));

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('disconnects the observer on unmount', () => {
      const { unmount } = render(<ExpandableText>{text}</ExpandableText>);
      expect(disconnect).not.toHaveBeenCalled();
      unmount();
      expect(disconnect).toHaveBeenCalledTimes(1);
    });
  });
});
