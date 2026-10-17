// pdfjs-dist is ESM-only and draws on canvas, which jsdom lacks. getDocument
// never settles unless a test mocks it, so the viewer stays loading.
class EventBus {
  listeners = {};

  on(name, listener) {
    this.listeners[name] = [...(this.listeners[name] || []), listener];
  }

  dispatch(name, data) {
    (this.listeners[name] || []).forEach((listener) => listener(data));
  }
}

const PDFViewer = jest.fn(function PDFViewer({ eventBus }) {
  this.eventBus = eventBus;
  this.pagesCount = 0;
  this.currentPageNumber = 1;
  let currentScaleValue = 'auto';
  Object.defineProperty(this, 'currentScaleValue', {
    configurable: true,
    get: () => currentScaleValue,
    set: (presetValue) => {
      currentScaleValue = presetValue;
      eventBus.dispatch('scalechanging', { presetValue });
    },
  });
  this.pagesPromise = Promise.resolve();
  this.setDocument = jest.fn((pdfDocument) => {
    this.pagesCount = pdfDocument ? pdfDocument.numPages : 0;
    if (pdfDocument) {
      eventBus.dispatch('pagesinit');
    }
  });
  this.increaseScale = jest.fn();
  this.decreaseScale = jest.fn();
});

const PDFLinkService = jest.fn(function PDFLinkService() {
  this.setViewer = jest.fn();
  this.setDocument = jest.fn();
});

const PDFFindController = jest.fn(function PDFFindController() {
  this.setDocument = jest.fn();
  this.scrollMatchIntoView = jest.fn(({ element }) =>
    element.scrollIntoView({ block: 'start', inline: 'center' }),
  );
});

module.exports = {
  __esModule: true,
  AnnotationEditorType: { DISABLE: -1 },
  GlobalWorkerOptions: {},
  LinkTarget: { NONE: 0, SELF: 1, BLANK: 2, PARENT: 3, TOP: 4 },
  PDFFindController,
  PDFLinkService,
  getDocument: jest.fn(() => ({
    promise: new Promise(() => {}),
    destroyed: false,
    destroy: jest.fn(() => Promise.resolve()),
  })),
  EventBus,
  PDFViewer,
};
