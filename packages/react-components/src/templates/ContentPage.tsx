/** @jsxImportSource @emotion/react */
import { PageResponse } from '@asap-hub/model';
import { css } from '@emotion/react';

import { Display } from '../atoms';
import { contentSidePaddingWithNavigation } from '../layout';
import { RichText } from '../organisms';
import { rem } from '../pixels';
import { useScrollToHash } from '../routing';

const styles = css({
  padding: `${rem(36)} ${contentSidePaddingWithNavigation(8)}`,
});

type ContentPageProps = Pick<PageResponse, 'text' | 'title'>;
const ContentPage: React.FC<ContentPageProps> = ({ text, title }) => {
  useScrollToHash();

  return (
    <article
      css={({ components }) => [styles, components?.ContentPage?.styles]}
    >
      <Display styleAsHeading={4}>{title}</Display>
      <RichText toc text={text} />
    </article>
  );
};

export default ContentPage;
