import { css } from '@emotion/react';
import { lazy, Suspense } from 'react';

import { Card, Headline2 } from '../atoms';
import PdfViewerLayout from './PdfViewerLayout';

const PdfViewer = lazy(() => import('./PdfViewer'));

const cardStyles = css({
  '@media print': {
    display: 'none',
  },
});

type GrantDocumentPdfCardProps = {
  link: string;
};

const GrantDocumentPdfCard: React.FC<GrantDocumentPdfCardProps> = ({
  link,
}) => (
  <Card overrideStyles={cardStyles}>
    <Headline2 styleAsHeading={4} noMargin>
      Grant Document PDF
    </Headline2>
    <Suspense fallback={<PdfViewerLayout />}>
      <PdfViewer key={link} url={link} title="Grant Document PDF" />
    </Suspense>
  </Card>
);

export default GrantDocumentPdfCard;
