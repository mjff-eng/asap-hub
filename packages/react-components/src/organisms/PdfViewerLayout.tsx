import { css } from '@emotion/react';
import { ReactNode } from 'react';

import { Paragraph } from '../atoms';
import { borderWidth, textPaddingBottom, textPaddingTop } from '../form';
import { lineHeight, rem } from '../pixels';

const toolbarStyles = css({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: rem(18),
  minHeight: rem(
    textPaddingTop + lineHeight + textPaddingBottom + 2 * borderWidth,
  ),
  marginTop: rem(16),
});

const frameStyles = css({
  position: 'relative',
  marginTop: rem(16),
  width: '100%',
  aspectRatio: '1 / 1.414',
  borderRadius: rem(16),
  overflow: 'hidden',
});

type PdfViewerLayoutProps = {
  toolbar?: ReactNode;
  children?: ReactNode;
};

// Separate from PdfViewer so the Suspense fallback can use it without pdf.js
const PdfViewerLayout: React.FC<PdfViewerLayoutProps> = ({
  toolbar = (
    <Paragraph noMargin accent="tertiary">
      Loading PDF...
    </Paragraph>
  ),
  children,
}) => (
  <>
    <div css={toolbarStyles}>{toolbar}</div>
    <div css={frameStyles}>{children}</div>
  </>
);

export default PdfViewerLayout;
