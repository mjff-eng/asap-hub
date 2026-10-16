import { PDFViewer } from '@embedpdf/react-pdf-viewer';
import type { PluginRegistry } from '@embedpdf/react-pdf-viewer';
import { render, screen } from '@testing-library/react';

import PdfViewer from '../PdfViewer';

jest.mock('@embedpdf/snippet/dist/pdfium.wasm?url', () => ({
  __esModule: true,
  default: '/assets/pdfium.wasm',
}));

const url = 'https://example.com/grant.pdf';
const title = 'Grant Document PDF';

const expectConfig = (config: object) =>
  expect(PDFViewer).toHaveBeenCalledWith(
    expect.objectContaining({ config: expect.objectContaining(config) }),
    expect.anything(),
  );

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PdfViewer', () => {
  it('views the PDF from its link in a light theme', () => {
    render(<PdfViewer url={url} title={title} />);

    expect(screen.getByRole('region', { name: title })).toBeVisible();
    expectConfig({
      src: url,
      theme: expect.objectContaining({ preference: 'light' }),
    });
  });

  it('offers no download, print or screenshot', () => {
    render(<PdfViewer url={url} title={title} />);

    expectConfig({
      disabledCategories: expect.arrayContaining([
        'document-print',
        'document-export',
        'document-capture',
      ]),
    });
  });

  describe('toolbar', () => {
    const startViewer = (plugins: Record<string, object>) => {
      render(<PdfViewer url={url} title={title} />);
      const onReady = jest.mocked(PDFViewer).mock.lastCall?.[0].onReady;
      expect(onReady).toEqual(expect.any(Function));
      onReady?.({
        getPlugin: (id: string) => plugins[id] ?? null,
      } as unknown as PluginRegistry);
    };

    const setUpToolbar = () => {
      const toggleMenu = jest.fn();
      const plugins = {
        commands: { registerCommand: jest.fn() },
        i18n: {
          getLocaleInfo: () => ({
            code: 'en',
            name: 'English',
            translations: { search: { placeholder: 'Search' } },
          }),
          registerLocale: jest.fn(),
          setLocale: jest.fn(),
        },
        ui: {
          getSchema: () => ({
            overlays: { 'page-controls': {}, 'unlock-owner-overlay': {} },
          }),
          mergeSchema: jest.fn(),
          forDocument: () => ({ toggleMenu }),
        },
      };
      startViewer({
        commands: { provides: () => plugins.commands },
        i18n: { provides: () => plugins.i18n },
        ui: { provides: () => plugins.ui },
      });

      const command = (id: string) =>
        plugins.commands.registerCommand.mock.calls
          .map(([registered]) => registered)
          .find((registered) => registered.id === id);
      return { ...plugins, command, toggleMenu };
    };

    it('is laid out like the browser PDF toolbar, with no page number below', () => {
      const { ui } = setUpToolbar();

      const [[{ toolbars, overlays }]] = ui.mergeSchema.mock.calls;
      expect(
        toolbars['main-toolbar'].items.map(
          (item: { type: string; commandId?: string }) =>
            item.commandId ?? item.type,
        ),
      ).toEqual([
        'panel:toggle-sidebar',
        'page:settings',
        'spacer',
        'toolbar:page-number',
        'divider',
        'zoom:out',
        'toolbar:zoom-level',
        'zoom:in',
        'divider',
        'pan:toggle',
        'pointer:toggle',
        'spacer',
        'panel:toggle-search',
      ]);
      expect(overlays).toEqual({ 'unlock-owner-overlay': {} });
    });

    it('gives page settings the button id its menu opens under', () => {
      const { ui } = setUpToolbar();

      const [[{ toolbars }]] = ui.mergeSchema.mock.calls;
      expect(toolbars['main-toolbar'].items).toContainEqual(
        expect.objectContaining({
          id: 'page-settings-button',
          commandId: 'page:settings',
        }),
      );
    });

    it('keeps the sidebar, page number, zoom level and search on narrow cards, and drops the sidebar on the narrowest', () => {
      const { ui } = setUpToolbar();

      const [[{ toolbars }]] = ui.mergeSchema.mock.calls;
      const { narrow, wide, narrowest, notNarrowest } =
        toolbars['main-toolbar'].responsive.breakpoints;
      expect(narrow.hide).toEqual([
        'page-settings-button',
        'zoom-out',
        'zoom-in',
        'divider-zoom',
        'pan',
        'pointer',
      ]);
      expect(wide.show).toEqual(narrow.hide);
      expect(wide.minWidth).toBe(narrow.maxWidth + 1);
      expect(narrowest.hide).toEqual(['sidebar']);
      expect(notNarrowest.show).toEqual(narrowest.hide);
      expect(notNarrowest.minWidth).toBe(narrowest.maxWidth + 1);
    });

    const state = (documents: object) => ({
      plugins: { scroll: { documents }, zoom: { documents } },
    });

    it('shows the page number and zoom level as text', () => {
      const { i18n, command } = setUpToolbar();
      const loaded = state({
        doc: { currentPage: 2, totalPages: 15, currentZoomLevel: 1.254 },
      });

      expect(i18n.registerLocale).toHaveBeenCalledWith({
        code: 'en-GB',
        name: 'English',
        translations: {
          search: { placeholder: 'Search' },
          toolbar: {
            pageNumber: '{page}\u00a0/\u00a0{pages}',
            zoomLevel: '{level}%',
          },
        },
      });
      expect(i18n.setLocale).toHaveBeenCalledWith('en-GB');
      expect(
        command('toolbar:page-number').labelParams({
          state: loaded,
          documentId: 'doc',
        }),
      ).toEqual({ page: 2, pages: 15 });
      expect(
        command('toolbar:zoom-level').labelParams({
          state: loaded,
          documentId: 'doc',
        }),
      ).toEqual({ level: 125 });
      expect(
        command('toolbar:zoom-level').labelParams({
          state: state({}),
          documentId: 'doc',
        }),
      ).toEqual({ level: 100 });
    });

    it('hides the page number until the pages are counted', () => {
      const pageNumber = setUpToolbar().command('toolbar:page-number');
      const visibleWith = (documents: object) =>
        pageNumber.visible({ state: state(documents), documentId: 'doc' });

      expect(visibleWith({})).toBe(false);
      expect(visibleWith({ doc: { currentPage: 1, totalPages: 0 } })).toBe(
        false,
      );
      expect(visibleWith({ doc: { currentPage: 1, totalPages: 15 } })).toBe(
        true,
      );
      expect(() =>
        pageNumber.labelParams({ state: state({}), documentId: 'doc' }),
      ).not.toThrow();
    });

    it("keeps EmbedPDF's own toolbar when a plugin it needs is missing", () => {
      const mergeSchema = jest.fn();

      startViewer({ commands: {}, ui: { provides: () => ({ mergeSchema }) } });

      expect(mergeSchema).not.toHaveBeenCalled();
    });

    it('opens the zoom menu from the zoom level, and nothing from the page number', () => {
      const { command, toggleMenu } = setUpToolbar();

      command('toolbar:page-number').action({ documentId: 'doc' });
      expect(toggleMenu).not.toHaveBeenCalled();

      command('toolbar:zoom-level').action({ documentId: 'doc' });
      expect(toggleMenu).toHaveBeenCalledWith(
        'zoom-menu',
        'toolbar:zoom-level',
        'zoom-level',
      );
    });
  });

  it('loads PDFium from our own assets and no fonts or stamps from other sites', () => {
    render(<PdfViewer url={url} title={title} />);

    expectConfig({
      wasmUrl: 'http://localhost/assets/pdfium.wasm',
      fontFallback: null,
      fonts: {
        ui: expect.objectContaining({ stylesheetUrl: null }),
        signature: null,
      },
      stamp: { manifests: [] },
    });
  });
});
