import { css } from '@emotion/react';

import { Card, Headline2 } from '../atoms';
import { rem } from '../pixels';

const pdfStyles = css({
  display: 'block',
  marginTop: rem(16),
  width: '100%',
  aspectRatio: '1 / 1.414',
  border: 0,
  borderRadius: rem(16),
});

type GrantDocumentPdfCardProps = {
  link: string;
};

const GrantDocumentPdfCard: React.FC<GrantDocumentPdfCardProps> = ({
  link,
}) => (
  <Card>
    <Headline2 styleAsHeading={4} noMargin>
      Grant Document PDF
    </Headline2>
    <iframe
      title="Grant Document PDF"
      src={link}
      loading="lazy"
      css={pdfStyles}
    />
  </Card>
);

export default GrantDocumentPdfCard;
