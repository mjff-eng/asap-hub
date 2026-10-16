import { PDFViewer } from '@embedpdf/react-pdf-viewer';
import type { PluginRegistry } from '@embedpdf/react-pdf-viewer';
import pdfiumPath from '@embedpdf/snippet/dist/pdfium.wasm?url';
import { css } from '@emotion/react';

import { colour } from '../colors';
import { fontStyles } from '../text';

// PDFium runs in a worker loaded from a blob: URL, which can't resolve a
// relative path
const wasmUrl = new URL(pdfiumPath, window.location.href).href;

const disabledCategories = [
  'document-print',
  'document-export',
  'document-capture',
  'capture',
  'document-open',
  'document-close',
  'document-protect',
  'annotation',
  'redaction',
  'insert',
  'form',
  'history',
  'panel-comment',
];

type CommandContext = {
  documentId: string;
  state: {
    plugins: {
      scroll: {
        documents: Record<string, { currentPage: number; totalPages: number }>;
      };
      zoom: { documents: Record<string, { currentZoomLevel: number }> };
    };
  };
};

const zoomLevelItemId = 'zoom-level';
const pageSettingsItemId = 'page-settings-button';

const commandButton = (
  id: string,
  commandId: string,
  variant: 'icon' | 'text' = 'icon',
) => ({ type: 'command-button', id, commandId, variant });

const toolbarItems = [
  commandButton('sidebar', 'panel:toggle-sidebar'),
  commandButton(pageSettingsItemId, 'page:settings'),
  { type: 'spacer', id: 'spacer-start', flex: true },
  commandButton('page-number', 'toolbar:page-number', 'text'),
  { type: 'divider', id: 'divider-page', orientation: 'vertical' },
  commandButton('zoom-out', 'zoom:out'),
  commandButton(zoomLevelItemId, 'toolbar:zoom-level', 'text'),
  commandButton('zoom-in', 'zoom:in'),
  { type: 'divider', id: 'divider-zoom', orientation: 'vertical' },
  commandButton('pan', 'pan:toggle'),
  commandButton('pointer', 'pointer:toggle'),
  { type: 'spacer', id: 'spacer-end', flex: true },
  commandButton('search', 'panel:toggle-search'),
];

const hiddenWhenNarrow = [
  pageSettingsItemId,
  'zoom-out',
  'zoom-in',
  'divider-zoom',
  'pan',
  'pointer',
];
const hiddenWhenNarrowest = ['sidebar'];

const showBrowserToolbar = (registry: PluginRegistry) => {
  const capability = (id: string) => registry.getPlugin(id)?.provides?.();
  const commands = capability('commands');
  const i18n = capability('i18n');
  const ui = capability('ui');
  const english = i18n?.getLocaleInfo('en');
  if (!commands || !ui || !english) return;

  commands.registerCommand({
    id: 'toolbar:page-number',
    labelKey: 'toolbar.pageNumber',
    labelParams: ({ state, documentId }: CommandContext) => {
      const scroll = state.plugins.scroll.documents[documentId];
      return { page: scroll?.currentPage, pages: scroll?.totalPages };
    },
    visible: ({ state, documentId }: CommandContext) =>
      Boolean(state.plugins.scroll.documents[documentId]?.totalPages),
    action: () => undefined,
  });
  commands.registerCommand({
    id: 'toolbar:zoom-level',
    labelKey: 'toolbar.zoomLevel',
    labelParams: ({ state, documentId }: CommandContext) => {
      const zoom = state.plugins.zoom.documents[documentId];
      return { level: Math.round((zoom?.currentZoomLevel ?? 1) * 100) };
    },
    action: ({ documentId }: CommandContext) =>
      ui
        .forDocument(documentId)
        .toggleMenu('zoom-menu', 'toolbar:zoom-level', zoomLevelItemId),
  });

  const overlays = { ...ui.getSchema().overlays };
  delete overlays['page-controls'];
  ui.mergeSchema({
    toolbars: {
      'main-toolbar': {
        items: toolbarItems,
        responsive: {
          breakpoints: {
            narrow: { maxWidth: 520, hide: hiddenWhenNarrow },
            wide: { minWidth: 521, show: hiddenWhenNarrow },
            narrowest: { maxWidth: 260, hide: hiddenWhenNarrowest },
            notNarrowest: { minWidth: 261, show: hiddenWhenNarrowest },
          },
        },
      },
    },
    overlays,
  });

  i18n.registerLocale({
    ...english,
    code: 'en-GB',
    translations: {
      ...english.translations,
      toolbar: {
        pageNumber: '{page}\u00a0/\u00a0{pages}',
        zoomLevel: '{level}%',
      },
    },
  });
  i18n.setLocale('en-GB');
};

const regionStyles = css({
  position: 'absolute',
  inset: 0,
});

const viewerStyles = css({
  height: '100%',
});

type PdfViewerProps = {
  url: string;
  title: string;
};

const PdfViewer: React.FC<PdfViewerProps> = ({ url, title }) => (
  <div role="region" aria-label={title} css={regionStyles}>
    <PDFViewer
      css={viewerStyles}
      config={{
        src: url,
        wasmUrl,
        fontFallback: null,
        fonts: {
          ui: { stylesheetUrl: null, family: fontStyles.fontFamily },
          signature: null,
        },
        stamp: { manifests: [] },
        theme: {
          preference: 'light',
          light: {
            accent: {
              primary: colour.background.button.primary.default,
              primaryHover: colour.background.button.primary.hover,
              primaryActive: colour.background.button.primary.hover,
              primaryLight: colour.background['hover-brand'],
            },
            interactive: {
              selected: colour.background['hover-brand'],
              focus: colour.border.brand,
              focusRing: colour.background['hover-brand'],
            },
          },
        },
        disabledCategories,
      }}
      onReady={showBrowserToolbar}
    />
  </div>
);

export default PdfViewer;
