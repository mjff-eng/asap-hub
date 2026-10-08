import { css } from '@emotion/react';

import { Display, Paragraph, Button, Card } from '../atoms';

const containerStyles = css({
  maxWidth: '440px',
});
const styles = css({
  display: 'grid',
  textAlign: 'center',
});
const buttonContainerStyles = css({
  display: 'flex',
  justifyContent: 'center',
});

type WelcomeProps = {
  readonly buttonText: string;
  readonly content: string;
  readonly signup?: boolean;
  readonly title: string;
  readonly children?: React.ReactNode;
  readonly onClick: () => void;
};

const Welcome: React.FC<WelcomeProps> = ({
  buttonText,
  content,
  title,
  children,
  onClick,
}) => (
  <div css={containerStyles}>
    <Card>
      <article css={styles}>
        <header>
          <Display styleAsHeading={2}>{title}</Display>
          <Paragraph accent="tertiary">{content}</Paragraph>
        </header>

        <section css={buttonContainerStyles}>
          <Button primary onClick={onClick}>
            {buttonText}
          </Button>
        </section>
        <section>{children}</section>
      </article>
    </Card>
  </div>
);

export default Welcome;
