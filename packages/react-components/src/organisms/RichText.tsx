import { createElement, ReactElement } from 'react';
import { css } from '@emotion/react';

import unified from 'unified';
import rehypeHtml from 'rehype-parse';
import rehypeSanitize from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import rehypeToc from 'rehype-toc';
import rehypeReact from 'rehype-react';
import { renderToStaticMarkup } from 'react-dom/server';
import githubSanitizationSchema from 'hast-util-sanitize/lib/github';

import { parseComponents, parseTagNames } from '../utils/parsing';
import { Headline2 } from '../atoms';
import { rem } from '../pixels';
import { neutral900, colour } from '../colors';

interface RichTextProps {
  readonly toc?: boolean;
  readonly text: string;
  readonly poorText?: undefined;
}

interface PoorTextProps {
  readonly toc?: undefined;
  readonly text: string;
  readonly poorText: true;
}

const styles = css({
  color: neutral900.rgb,
  '.toc-level': {
    listStyle: 'none',
  },
  '.toc-level-1': {
    padding: 0,
  },
  '.toc-level-2': {
    paddingLeft: rem(18),
  },
  'p > strong, b, h4, h5, h6': {
    color: colour.foreground.primary,
  },
  img: { height: 'auto', maxWidth: '100%' },
});

const tableOfContentsStyles = css({
  color: colour.foreground.primary,
});

const hasClass = (html: string, className: string): boolean => {
  const doc = document.createElement('DIV');
  doc.innerHTML = html;
  return !!doc.querySelectorAll(`.${className}`).length;
};

const RichText: React.FC<RichTextProps | PoorTextProps> = ({
  toc = false,
  text,
  poorText = false,
}) => {
  let processor = unified().use(rehypeHtml, { fragment: true });

  processor = processor.use(rehypeSanitize, {
    tagNames: parseTagNames(poorText),
    attributes: {
      ...githubSanitizationSchema.attributes,
      iframe: [
        'src',
        'title',
        'width',
        'height',
        ['allow', 'fullscreen'],
        'allowfullscreen',
      ],
    },
  });

  if (toc) {
    processor = processor
      .use(rehypeSlug)
      .use(rehypeToc, { headings: ['h1', 'h2'] });
  }

  processor = processor.use(rehypeReact, {
    components: parseComponents,
    createElement,
  });

  const { result } = processor.processSync(text);
  const hasTocItems =
    hasClass(renderToStaticMarkup(result as ReactElement), 'toc-item') || false;
  return (
    <>
      <div css={styles}>
        {toc && hasTocItems && (
          <span css={tableOfContentsStyles}>
            <Headline2 styleAsHeading={4}>Contents</Headline2>
          </span>
        )}
        <>{result}</>
      </div>
    </>
  );
};

export default RichText;
