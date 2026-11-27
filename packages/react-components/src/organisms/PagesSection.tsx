import { css } from '@emotion/react';
import { PageResponse } from '@asap-hub/model';

import PageCard from './PageCard';
import { rem } from '../pixels';
import { Headline2 } from '../atoms';
import { tileGridStyles } from '../layout';

type PagesProps = {
  readonly title: string;
  readonly pages: ReadonlyArray<PageResponse>;
};

const gridContainerStyles = css(tileGridStyles, {
  rowGap: rem(36),
  marginTop: rem(24),
});

const Pages: React.FC<PagesProps> = ({ title, pages }) => (
  <section>
    <Headline2 styleAsHeading={5}>{title}</Headline2>
    <div css={gridContainerStyles}>
      {pages.map((page, idx) => (
        <PageCard key={`page-${idx}`} {...page} />
      ))}
    </div>
  </section>
);

export default Pages;
