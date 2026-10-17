import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  AnnotationEditorType,
  getDocument,
  PDFDocumentLoadingTask,
} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  LinkTarget,
  PDFFindController,
  PDFLinkService,
  PDFViewer,
} from 'pdfjs-dist/legacy/web/pdf_viewer.mjs';

import PdfViewer from '../PdfViewer';

const url = 'https://example.com/grant.pdf';
const title = 'Grant Document PDF';

const mockLoadingTask = (load: Promise<unknown>) => {
  let rejectOnDestroy: (reason: Error) => void = jest.fn();
  const loadingTask = {
    promise: Promise.race([
      load,
      new Promise((_resolve, reject) => {
        rejectOnDestroy = reject;
      }),
    ]),
    destroyed: false,
    destroy: jest.fn(() => {
      loadingTask.destroyed = true;
      rejectOnDestroy(new Error('Worker was destroyed'));
      return Promise.resolve();
    }),
  };
  jest
    .mocked(getDocument)
    .mockReturnValueOnce(loadingTask as unknown as PDFDocumentLoadingTask);
  return loadingTask;
};

const getViewer = () => {
  const [viewer] = jest.mocked(PDFViewer).mock.instances;
  if (!viewer) {
    throw new Error('No PDFViewer was created');
  }
  return viewer;
};

const renderLoaded = async (pdfDocument = { numPages: 3 }) => {
  mockLoadingTask(Promise.resolve(pdfDocument));
  render(<PdfViewer url={url} title={title} />);
  return screen.findByRole('textbox', { name: 'Page number' });
};

let resizeCallback: ResizeObserverCallback;
const disconnect = jest.fn();
globalThis.ResizeObserver = jest.fn((callback) => {
  resizeCallback = callback;
  return { observe: jest.fn(), disconnect, unobserve: jest.fn() };
}) as unknown as typeof ResizeObserver;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PdfViewer', () => {
  it('renders the document fitted to the page with a page counter', async () => {
    const pageField = renderLoaded();
    expect(screen.getByText('Loading PDF...')).toBeVisible();

    expect(await pageField).toHaveValue('1');
    expect(screen.getByText('/ 3')).toBeVisible();
    expect(screen.queryByText('Loading PDF...')).not.toBeInTheDocument();
    expect(getDocument).toHaveBeenCalledWith({ url });
    expect(getViewer().currentScaleValue).toBe('page-fit');
    expect(PDFViewer).toHaveBeenCalledWith(
      expect.objectContaining({
        annotationEditorMode: AnnotationEditorType.DISABLE,
      }),
    );
    expect(
      screen.getByRole('region', { name: 'Grant Document PDF' }),
    ).toBeVisible();
  });

  it('opens links in a new tab and follows links and searches within the document', async () => {
    const pdfDocument = { numPages: 3 };
    await renderLoaded(pdfDocument);

    expect(PDFLinkService).toHaveBeenCalledWith(
      expect.objectContaining({ externalLinkTarget: LinkTarget.BLANK }),
    );
    const [linkService] = jest.mocked(PDFLinkService).mock.instances;
    expect(jest.mocked(linkService?.setViewer)).toHaveBeenCalledWith(
      getViewer(),
    );
    expect(jest.mocked(linkService?.setDocument)).toHaveBeenCalledWith(
      pdfDocument,
    );
    // PDFViewer does this after the first render. Calling it earlier too
    // resets a search typed in between.
    const [findController] = jest.mocked(PDFFindController).mock.instances;
    expect(PDFViewer).toHaveBeenCalledWith(
      expect.objectContaining({ findController }),
    );
    expect(jest.mocked(findController?.setDocument)).not.toHaveBeenCalled();
  });

  it('updates the page counter when the current page changes', async () => {
    const pageField = await renderLoaded();

    act(() => getViewer().eventBus.dispatch('pagechanging', { pageNumber: 2 }));

    expect(pageField).toHaveValue('2');
  });

  it('goes to the page typed in the page field', async () => {
    const pageField = await renderLoaded();

    await userEvent.clear(pageField);
    await userEvent.type(pageField, '3{Enter}');

    expect(getViewer().currentPageNumber).toBe(3);
  });

  it('ignores a page outside the document', async () => {
    const pageField = await renderLoaded();

    await userEvent.clear(pageField);
    await userEvent.type(pageField, '9');
    await userEvent.tab();

    expect(getViewer().currentPageNumber).toBe(1);
    expect(pageField).toHaveValue('1');
  });

  it('searches the document and steps through the matches', async () => {
    await renderLoaded();
    const dispatch = jest.spyOn(getViewer().eventBus, 'dispatch');
    const findWith = (params: object) =>
      expect(dispatch).toHaveBeenLastCalledWith(
        'find',
        expect.objectContaining(params),
      );

    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Search document' }),
      'grant',
    );
    findWith({ type: '', query: 'grant', highlightAll: true });

    act(() =>
      getViewer().eventBus.dispatch('updatefindmatchescount', {
        matchesCount: { current: 1, total: 3 },
      }),
    );
    expect(screen.getByText('1 of 3')).toBeVisible();

    await userEvent.keyboard('{Enter}');
    findWith({ type: 'again', query: 'grant', findPrevious: false });
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
    findWith({ type: 'again', findPrevious: true });
    await userEvent.click(screen.getByRole('button', { name: 'Next match' }));
    findWith({ type: 'again', findPrevious: false });
    await userEvent.click(
      screen.getByRole('button', { name: 'Previous match' }),
    );
    findWith({ type: 'again', findPrevious: true });
  });

  it('keeps searches inside the document out of analytics', async () => {
    Object.defineProperty(window, 'dataLayer', {
      configurable: true,
      value: [],
    });
    await renderLoaded();

    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Search document' }),
      'budget',
    );

    expect(window.dataLayer).toEqual([]);
    Reflect.deleteProperty(window, 'dataLayer');
  });

  it('scrolls to a match within the viewer, leaving the page where it is', async () => {
    await renderLoaded();
    const viewerBox = screen.getByRole('region', {
      name: 'Grant Document PDF',
    });
    viewerBox.scrollBy = jest.fn();
    jest
      .spyOn(viewerBox, 'getBoundingClientRect')
      .mockReturnValue({ top: 100, left: 0, width: 600 } as DOMRect);
    const match = document.createElement('span');
    const scrollPage = jest.fn();
    match.scrollIntoView = scrollPage;
    jest
      .spyOn(match, 'getBoundingClientRect')
      .mockReturnValue({ top: 900, left: 500, width: 40 } as DOMRect);

    const [findController] = jest.mocked(PDFFindController).mock.instances;
    findController?.scrollMatchIntoView({
      element: match,
      pageIndex: 2,
      matchIndex: 0,
    });

    expect(viewerBox.scrollBy).toHaveBeenCalledWith({ top: 800, left: 220 });
    expect(scrollPage).not.toHaveBeenCalled();
  });

  it('shows the matches once pdf.js has searched every page', async () => {
    await renderLoaded();
    expect(PDFFindController).toHaveBeenCalledWith(
      expect.objectContaining({ updateMatchesCountOnProgress: false }),
    );
    const searchbox = screen.getByRole('searchbox', {
      name: 'Search document',
    });
    await userEvent.type(searchbox, 'grant');
    const report = (name: string, total: number) =>
      act(() =>
        getViewer().eventBus.dispatch(name, {
          matchesCount: { current: Math.min(total, 1), total },
        }),
      );

    report('updatefindcontrolstate', 2);
    expect(screen.getByText('1 of 2')).toBeVisible();

    await userEvent.type(searchbox, 's');
    expect(screen.queryByText('1 of 2')).not.toBeInTheDocument();

    report('updatefindmatchescount', 0);
    expect(screen.getByText('No matches')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Next match' })).toBeDisabled();
  });

  it('fits the whole page again after zooming', async () => {
    await renderLoaded();
    const fitButton = screen.getByRole('button', { name: 'Fit to page' });
    expect(fitButton).toBeDisabled();

    act(() => getViewer().eventBus.dispatch('scalechanging', { scale: 1.5 }));
    const setScale = jest.spyOn(getViewer(), 'currentScaleValue', 'set');
    await userEvent.click(fitButton);

    expect(setScale).toHaveBeenCalledWith('page-fit');
    expect(fitButton).toBeDisabled();
  });

  it('zooms in and out', async () => {
    await renderLoaded();

    await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(jest.mocked(getViewer().increaseScale)).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(jest.mocked(getViewer().decreaseScale)).toHaveBeenCalledTimes(1);
  });

  it('offers no download, print or drive buttons', async () => {
    await renderLoaded({ numPages: 1 });

    expect(
      screen
        .getAllByRole('button')
        .map(
          (button) => button.getAttribute('aria-label') ?? button.textContent,
        ),
    ).toEqual([
      'Previous match',
      'Next match',
      'Fit to page',
      'Zoom out',
      'Zoom in',
    ]);
  });

  it('shows a message when the PDF cannot be loaded', async () => {
    mockLoadingTask(Promise.reject(new Error('Blocked by CORS')));
    render(<PdfViewer url={url} title={title} />);

    expect(
      await screen.findByText('Unable to display this PDF.'),
    ).toBeVisible();
  });

  it('shows a message when the first page cannot be read', async () => {
    let resolveLoad: (pdfDocument: { numPages: number }) => void = jest.fn();
    mockLoadingTask(
      new Promise((resolve) => {
        resolveLoad = resolve;
      }),
    );
    render(<PdfViewer url={url} title={title} />);
    Object.defineProperty(getViewer(), 'pagesPromise', {
      get: () => Promise.reject(new Error('Invalid page')),
    });

    resolveLoad({ numPages: 3 });

    expect(
      await screen.findByText('Unable to display this PDF.'),
    ).toBeVisible();
  });

  it('adds pdf.js styles only while the viewer is open', () => {
    mockLoadingTask(new Promise(() => {}));
    const { unmount } = render(<PdfViewer url={url} title={title} />);
    const stylesheet = document.head.querySelector('link[rel="stylesheet"]');
    const lightScheme = [...document.head.querySelectorAll('style')].find(
      (style) => style.textContent === 'html:root { color-scheme: light; }',
    );
    expect(stylesheet).toBeInTheDocument();
    expect(lightScheme).toBeInTheDocument();

    unmount();

    expect(stylesheet).not.toBeInTheDocument();
    expect(lightScheme).not.toBeInTheDocument();
  });

  it('stops loading the PDF and releases the viewer on unmount', async () => {
    const loadingTask = mockLoadingTask(Promise.resolve({ numPages: 3 }));
    const { unmount } = render(<PdfViewer url={url} title={title} />);
    await screen.findByText('/ 3');

    unmount();

    expect(loadingTask.destroy).toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalled();
    expect(jest.mocked(getViewer().setDocument)).toHaveBeenLastCalledWith(null);
    const [linkService] = jest.mocked(PDFLinkService).mock.instances;
    expect(jest.mocked(linkService?.setDocument)).toHaveBeenLastCalledWith(
      null,
    );
  });

  describe('when the viewer resizes', () => {
    const resizeAt = async (currentScaleValue: string) => {
      await renderLoaded();
      const setScale = jest.fn();
      Object.defineProperty(getViewer(), 'currentScaleValue', {
        get: () => currentScaleValue,
        set: setScale,
      });
      resizeCallback([], {} as ResizeObserver);
      return setScale;
    };

    it('refits the page to the new size', async () => {
      expect(await resizeAt('page-fit')).toHaveBeenCalledWith('page-fit');
    });

    it('keeps the zoom the user picked', async () => {
      expect(await resizeAt('1.5')).not.toHaveBeenCalled();
    });
  });
});
