import { render, screen, waitFor } from '@testing-library/react';
import {
  getDocument,
  PDFDocumentLoadingTask,
} from 'pdfjs-dist/legacy/build/pdf.mjs';

import GrantDocumentPdfCard from '../GrantDocumentPdfCard';

it('views the grant document link in the PDF viewer', async () => {
  render(<GrantDocumentPdfCard link="https://example.com/grant.pdf" />);

  expect(
    screen.getByRole('heading', { name: 'Grant Document PDF' }),
  ).toBeVisible();
  expect(screen.getByText('Loading PDF...')).toBeVisible();
  await waitFor(() =>
    expect(getDocument).toHaveBeenCalledWith({
      url: 'https://example.com/grant.pdf',
    }),
  );
  expect(
    screen.getByRole('region', { name: 'Grant Document PDF' }),
  ).toBeInTheDocument();
});

it('loads the next grant document after one that failed', async () => {
  const loadingTask = (promise: Promise<unknown>) =>
    ({
      promise,
      destroyed: false,
      destroy: jest.fn(() => Promise.resolve()),
    }) as unknown as PDFDocumentLoadingTask;
  jest
    .mocked(getDocument)
    .mockImplementationOnce(() => loadingTask(Promise.reject(new Error())))
    .mockImplementationOnce(() =>
      loadingTask(Promise.resolve({ numPages: 2 })),
    );
  const { rerender } = render(
    <GrantDocumentPdfCard link="https://example.com/original.pdf" />,
  );
  expect(await screen.findByText('Unable to display this PDF.')).toBeVisible();

  rerender(<GrantDocumentPdfCard link="https://example.com/supplement.pdf" />);
  expect(await screen.findByText('/ 2')).toBeVisible();
  expect(
    screen.queryByText('Unable to display this PDF.'),
  ).not.toBeInTheDocument();
});
