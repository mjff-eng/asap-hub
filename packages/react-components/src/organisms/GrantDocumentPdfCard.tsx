import { css } from '@emotion/react';
import { lazy, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { Card, Headline2, Paragraph } from '../atoms';
import { useInView } from '../hooks';
import { Loading } from '../molecules';
import { rem } from '../pixels';

const PdfViewer = lazy(() => import('./PdfViewer'));

const cardStyles = css({
  '@media print': {
    display: 'none',
  },
});

const frameStyles = css({
  position: 'relative',
  marginTop: rem(16),
  aspectRatio: '1 / 1.414',
  borderRadius: rem(16),
  overflow: 'hidden',
});

type GrantDocumentPdfCardProps = {
  link: string;
};

const GrantDocumentPdfCard: React.FC<GrantDocumentPdfCardProps> = ({
  link,
}) => {
  const [frameRef, inView] = useInView<HTMLDivElement>();

  return (
    <Card overrideStyles={cardStyles}>
      <Headline2 styleAsHeading={4} noMargin>
        Grant Document PDF
      </Headline2>
      <div ref={frameRef} css={frameStyles}>
        {inView && (
          <ErrorBoundary
            key={link}
            fallback={
              <Paragraph accent="tertiary">
                Unable to display this PDF.
              </Paragraph>
            }
          >
            <Suspense fallback={<Loading />}>
              <PdfViewer url={link} title="Grant Document PDF" />
            </Suspense>
          </ErrorBoundary>
        )}
      </div>
    </Card>
  );
};

export default GrantDocumentPdfCard;
