import { AnchorHTMLAttributes } from 'react';
import { Link, LinkProps, useInRouterContext } from 'react-router';
import { css } from '@emotion/react';

import { isInternalLink } from '../utils';
import { useBlockedClick } from '../navigation';

const resetStyles = css({
  outline: 'none',
  textDecoration: 'none',
  color: 'unset',
});

// Lint rules don't understand abstractions ...
/* eslint-disable jsx-a11y/anchor-has-content */

type AnchorProps = {
  // hrefs may conditionally be undefined, but the prop is mandatory so it cannot be forgotten
  href: string | undefined;
  enabled?: boolean;
  // Opts an internal link out of same-tab routing, for places where navigating
  // away would discard unsaved work.
  openInNewTab?: boolean;
} & Omit<LinkProps, 'to'> &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel'>;
const Anchor: React.FC<AnchorProps> = ({
  href,
  enabled = true,
  onClick,
  openInNewTab = false,
  ...props
}) => {
  const blockedClick = useBlockedClick(onClick);
  const [internal, url] =
    enabled && href ? isInternalLink(href) : [false, undefined];
  if (useInRouterContext() && url && internal && !openInNewTab) {
    return (
      <Link {...props} to={url} css={resetStyles} onClick={blockedClick} />
    );
  }
  const newTab = openInNewTab || !internal;
  return (
    <a
      {...props}
      href={(enabled && href) || undefined}
      target={newTab ? '_blank' : undefined}
      rel={newTab ? 'noreferrer noopener' : undefined}
      css={resetStyles}
      onClick={onClick}
    />
  );
};

export default Anchor;
