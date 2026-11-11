import { Card, Headline2, Paragraph } from '@asap-hub/react-components';
import { css } from '@emotion/react';

interface InfoCardProps {
  readonly icon: React.ReactElement;
  readonly total: number;
  readonly title: string;
}

const cardStyles = css({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
});

const iconStyles = css({
  marginRight: '8px',
  display: 'inline-flex',
});

const InfoCard = ({ icon, total, title }: InfoCardProps) => (
  <Card overrideStyles={cardStyles}>
    <div
      css={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span css={iconStyles}>{icon}</span>
      <Headline2>{total}</Headline2>
    </div>
    <Paragraph noMargin>{title}</Paragraph>
  </Card>
);

export default InfoCard;
