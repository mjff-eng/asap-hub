/** @jsxImportSource @emotion/react */
import { PageResponse } from '@asap-hub/model';
import { css } from '@emotion/react';

import { Display } from '../atoms';
import { pageContainerStyles } from '../layout';
import { RichText } from '../organisms';
import { rem } from '../pixels';
import { useScrollToHash } from '../routing';

const styles = css(pageContainerStyles.crn, {
  paddingTop: rem(36),
  paddingBottom: rem(36),
});

type ContentPageProps = Pick<PageResponse, 'text' | 'title'>;
const ContentPage: React.FC<ContentPageProps> = ({ text, title }) => {
  useScrollToHash();

  return (
    <article
      // A product's own styles replace the CRN grid, which sets its margins
      // in media queries that a plain override would not reach.
      css={({ components }) => components?.ContentPage?.styles ?? styles}
    >
      <Display styleAsHeading={4}>{title}</Display>
      <RichText toc text={text} />
    </article>
  );
};

export default ContentPage;
