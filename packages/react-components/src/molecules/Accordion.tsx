/** @jsxImportSource @emotion/react */
import { FC, ReactNode, useState } from 'react';
import { css } from '@emotion/react';
import { Headline5, Link, Paragraph } from '..';
import { lineHeight, rem, tabletScreen } from '../pixels';
import { chevronDownIcon, ExternalLinkIcon, infoInfoIcon } from '../icons';
import { isInternalLink } from '../utils';
import { info500, info100, info200, neutral900, colour } from '../colors';

const containerStyles = css({
  padding: `0 ${rem(9)}`,
});

const itemStyles = css({
  borderBottom: `${colour.border.tertiary} solid 1px`,
  '~ div:last-of-type': {
    borderBottom: 'none',
  },
  padding: `${rem(12)} 0`,
  margin: `0 ${rem(9)}`,
});

const headerStyles = css({
  display: 'grid',
  width: '100%',
  gridColumnGap: rem(15),
  gridTemplateColumns: 'min-content 1fr min-content',
  padding: `0 ${rem(15)}`,
});

const iconStyles = css({
  width: rem(lineHeight),
  height: rem(lineHeight),
  alignSelf: 'center',
  svg: {
    transition: '250ms',
  },
});

const iconOpenStyles = css({
  svg: {
    transform: 'rotate(180deg)',
  },
});

const bodyStyles = css({
  padding: `0 ${rem(54)} ${rem(15)}`,
  color: neutral900.rgb,
});

const hiddenStyles = css({
  maxHeight: 0,
  overflow: 'hidden',
  transition: 'max-height 300ms ease-in-out',
});

const openStyles = css({
  maxHeight: '700px', // value larger than probable content
  transition: 'max-height 200ms ease-in-out',
});

const buttonStyles = css({
  textAlign: 'unset',
  border: 'none',
  outline: 'none',
  backgroundColor: 'unset',

  cursor: 'pointer',
  ':hover': {
    background: colour.background.tertiary,
    borderRadius: rem(4),
  },
});

const infoItem = css({
  padding: `${rem(15)} ${rem(9)} ${rem(9)} ${rem(24)}`,
  display: 'grid',
  gridColumnGap: rem(15),
  gridTemplateColumns: 'min-content 1fr auto',
  color: info500.rgb,
  background: info100.rgb,
  alignItems: 'center',
  alignContent: 'center',
  rowGap: rem(9),
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    paddingTop: rem(9),
  },
});

const infoButtonWrap = css({
  gridColumn: 'span 2',
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    gridColumn: 'unset',
  },
  '> a': {
    backgroundColor: info100.rgb,
    borderColor: info200.rgb,
    ':hover': {
      borderColor: info500.rgb,
    },
  },
});

type AccordionProps = {
  items: {
    icon: JSX.Element;
    title: string;
    description: ReactNode | string;
    href?: string;
    hrefText?: string;
  }[];
  info?: {
    text: string;
    href: string;
    hrefText: string;
  };
};

const Accordion: FC<AccordionProps> = ({ items, info }) => {
  const [opened, setOpened] = useState<number | undefined>();
  return (
    <>
      <div
        css={({ components }) => [
          containerStyles,
          components?.Accordion?.containerStyles,
        ]}
      >
        {items.map(({ icon, title, description, href, hrefText }, index) => (
          <div
            key={`accordion-${index}`}
            css={({ components }) => [
              itemStyles,
              components?.Accordion?.itemStyles,
            ]}
          >
            <button
              css={[buttonStyles, headerStyles]}
              onClick={() => setOpened(opened === index ? undefined : index)}
            >
              <div css={iconStyles}>{icon}</div>
              <Headline5>{title}</Headline5>
              <div css={[iconStyles, index === opened && iconOpenStyles]}>
                {chevronDownIcon}
              </div>
            </button>
            <div css={[hiddenStyles, index === opened && openStyles]}>
              <div css={bodyStyles}>
                {typeof description === 'string' ? (
                  <Paragraph>{description}</Paragraph>
                ) : (
                  description
                )}
                {href && (
                  <div css={{ width: 'fit-content' }}>
                    <Link buttonStyle small primary href={href}>
                      {hrefText}{' '}
                      {!isInternalLink(href)[0] && <ExternalLinkIcon />}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {info && (
        <div css={infoItem}>
          <div css={iconStyles}>{infoInfoIcon}</div>
          <span>{info.text}</span>
          <div css={infoButtonWrap}>
            <Link buttonStyle small noMargin href={info.href}>
              {info.hrefText}
            </Link>
          </div>
        </div>
      )}
    </>
  );
};
export default Accordion;
