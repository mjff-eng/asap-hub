import { createElement, HTMLAttributes, AnchorHTMLAttributes } from 'react';
import { css } from '@emotion/react';

import unified from 'unified';
import { ComponentLike } from 'rehype-react';
import rehypeHtml from 'rehype-parse';
import rehypeSanitize from 'rehype-sanitize';
import rehypeRemark from 'rehype-remark';
import remarkStringify from 'remark-stringify';
import githubSanitizationSchema from 'hast-util-sanitize/lib/github';

import { Paragraph, Headline4, Headline5, Headline6, Link } from '../atoms';
import { isAllowedChildren } from '../text';
import { ErrorCard } from '../molecules';
import { rem } from '../pixels';

const headline1Spacing = css({ paddingTop: rem(24) });
const iframeContainer = css({
  display: 'block',
  position: 'relative',
  paddingBottom: '56.25%',
  width: '100%',
  height: 0,

  iframe: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',

    border: 0,
  },
});

export const parseComponents = {
  p: ({ children }: HTMLAttributes<HTMLParagraphElement>) => (
    <Paragraph accent="neutral900">{children}</Paragraph>
  ),
  iframe: (props: HTMLAttributes<HTMLIFrameElement>) => (
    <span css={iframeContainer}>
      <iframe title="Embedded Page" {...props} />
    </span>
  ),
  h1: ({ children, id }: HTMLAttributes<HTMLHeadingElement>) =>
    isAllowedChildren(children) ? (
      <div css={headline1Spacing}>
        <Headline4 id={id}>{children}</Headline4>
      </div>
    ) : (
      <ErrorCard
        title="Styling Error"
        description="Invalid h1 heading styling"
      />
    ),
  h2: ({ children, id }: HTMLAttributes<HTMLHeadingElement>) =>
    isAllowedChildren(children) ? (
      <Headline5 id={id}>{children}</Headline5>
    ) : (
      <ErrorCard
        title="Styling Error"
        description="Invalid h2 heading styling"
      />
    ),
  h3: ({ children, id }: HTMLAttributes<HTMLHeadingElement>) =>
    isAllowedChildren(children) ? (
      <Headline6 id={id}>{children}</Headline6>
    ) : (
      <ErrorCard
        title="Styling Error"
        description="Invalid h3 heading styling"
      />
    ),
  a: ({ children, href }: AnchorHTMLAttributes<HTMLAnchorElement>) => {
    if (typeof href === 'undefined') {
      return (
        <ErrorCard
          title="Styling Error"
          description={`"${children}" is missing href`}
        />
      );
    }

    let tags: string[] = [];
    const htmlElements: string[] = [];

    const getTags = (node: React.ReactNode) =>
      Array.isArray(node) &&
      node?.forEach((child) => {
        if (child.type) {
          tags.push(child.type);
        } else {
          let html = '';

          if (tags.length) {
            tags.forEach((tag, index) => {
              if (index === 0) {
                html = `<${tag} style=color:inherit>${String(child)}</${tag}>`;
              } else {
                html = `<${tag} style=color:inherit>${html}</${tag}>`;
              }
            });
          } else {
            html = String(child);
          }

          htmlElements.push(html);
          tags = [];
        }
        if (child?.props?.children) {
          getTags(child.props.children);
        }
      });

    getTags(children);
    if (
      htmlElements.length &&
      htmlElements[0] &&
      htmlElements[0].startsWith('<')
    ) {
      return (
        <Link href={href}>
          <span dangerouslySetInnerHTML={{ __html: htmlElements.join('') }} />
        </Link>
      );
    }

    return <Link href={href}>{children}</Link>;
  },
} as Record<string, ComponentLike<ReturnType<typeof createElement>>>;

export const parseTagNames = (poorText = false) =>
  poorText
    ? ['a', 'p', 'br', 'sub', 'sup']
    : [
        ...Object.keys(parseComponents),
        // text modifiers with default UA styling
        'strong',
        'em',
        'sub',
        'sup',
        'i',
        'b',
        'u',
        // lists with default UA styling
        'ul',
        'ol',
        'li',
        // media
        'img',
        'iframe',
        // rehype-toc
        'nav',
      ];

export function richTextToMarkdown(text = '', poorText = false): string {
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

  processor = processor.use(rehypeRemark).use(remarkStringify, {
    bullet: '*',
    fence: '~',
    fences: true,
    incrementListMarker: false,
  });

  const { contents } = processor.processSync(text);
  const markdownText = contents as string;

  return markdownText.replace(/\n$/, '');
}
