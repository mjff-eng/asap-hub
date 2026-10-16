import { mockConsoleError } from '@asap-hub/dom-test-utils';
import { PDFViewer } from '@embedpdf/react-pdf-viewer';
import { act, render, screen } from '@testing-library/react';

import GrantDocumentPdfCard from '../GrantDocumentPdfCard';

const originalObserver = globalThis.IntersectionObserver;

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  globalThis.IntersectionObserver = originalObserver;
});

it('views the grant document link in the PDF viewer', async () => {
  render(<GrantDocumentPdfCard link="https://example.com/grant.pdf" />);

  expect(
    screen.getByRole('heading', { name: 'Grant Document PDF' }),
  ).toBeVisible();
  expect(screen.getByText('Loading...')).toBeVisible();
  expect(
    await screen.findByRole('region', { name: 'Grant Document PDF' }),
  ).toBeInTheDocument();
  expect(PDFViewer).toHaveBeenCalledWith(
    expect.objectContaining({
      config: expect.objectContaining({
        src: 'https://example.com/grant.pdf',
      }),
    }),
    expect.anything(),
  );
});

it('loads the viewer only once the card is near view', async () => {
  let intersect: IntersectionObserverCallback = jest.fn();
  globalThis.IntersectionObserver = jest.fn((callback) => {
    intersect = callback;
    return { observe: jest.fn(), disconnect: jest.fn() };
  }) as unknown as typeof IntersectionObserver;
  render(<GrantDocumentPdfCard link="https://example.com/grant.pdf" />);

  expect(
    screen.queryByRole('region', { name: 'Grant Document PDF' }),
  ).not.toBeInTheDocument();
  act(() =>
    intersect(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    ),
  );

  expect(
    await screen.findByRole('region', { name: 'Grant Document PDF' }),
  ).toBeInTheDocument();
});

it('starts a new viewer for the next grant document', async () => {
  const { rerender } = render(
    <GrantDocumentPdfCard link="https://example.com/original.pdf" />,
  );
  const originalViewer = await screen.findByRole('region', {
    name: 'Grant Document PDF',
  });

  rerender(<GrantDocumentPdfCard link="https://example.com/supplement.pdf" />);

  expect(screen.getByRole('region', { name: 'Grant Document PDF' })).not.toBe(
    originalViewer,
  );
});

describe('when the viewer fails to start', () => {
  mockConsoleError();

  afterEach(() => {
    jest.mocked(PDFViewer).mockImplementation(() => null);
  });

  it('shows a message in the card and tries again for the next grant document', async () => {
    jest.mocked(PDFViewer).mockImplementation(() => {
      throw new Error('PDFium failed to start');
    });
    const { rerender } = render(
      <GrantDocumentPdfCard link="https://example.com/original.pdf" />,
    );

    expect(
      await screen.findByText('Unable to display this PDF.'),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Grant Document PDF' }),
    ).toBeVisible();

    jest.mocked(PDFViewer).mockImplementation(() => null);
    rerender(
      <GrantDocumentPdfCard link="https://example.com/supplement.pdf" />,
    );

    expect(
      await screen.findByRole('region', { name: 'Grant Document PDF' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Unable to display this PDF.'),
    ).not.toBeInTheDocument();
  });
});
