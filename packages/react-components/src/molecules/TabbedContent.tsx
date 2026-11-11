/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { css, SerializedStyles } from '@emotion/react';
import { ReactNode, useEffect, useState } from 'react';
import { Headline3, TabButton, Button } from '../atoms';
import { colour } from '../colors';
import { rem } from '../pixels';
import { TabNav } from '.';

const headerStyles = css({
  display: 'grid',
  paddingBottom: 0,
  borderBottom: `1px solid ${colour.border.tertiary}`,
});

const titleStyles = css({
  marginBottom: rem(24),
});

const descriptionStyles = (description?: ReactNode) =>
  css({
    marginBottom: description ? rem(40) : rem(16),
  });

const showMoreStyles = css({
  display: 'flex',
  justifyContent: 'center',
  borderTop: `1px solid ${colour.border.tertiary}`,
  paddingTop: rem(16),
  marginTop: rem(32),
});

const emptyContainer = css({
  paddingTop: rem(24),
});

export type TabProps<T> = {
  tabTitle: string;
  items: ReadonlyArray<T>;
  truncateFrom?: number;
  disabled?: boolean;
  empty: ReactNode;
};

type TabbedCardProps<T> = {
  title?: string;
  description?: ReactNode;
  overrideDescriptionStyles?: SerializedStyles;
  tabs: TabProps<T>[];
  activeTabIndex?: number;
  onTabChange?: (index: number) => void;
  getShowMoreText?: (showMore: boolean) => string;
  children: (state: { data: T[] }) => ReactNode;
};

export const TabbedContent = <T extends object>({
  title,
  description,
  overrideDescriptionStyles,
  tabs,
  activeTabIndex = 0,
  onTabChange,
  getShowMoreText,
  children,
}: TabbedCardProps<T>) => {
  const [active, setActive] = useState(activeTabIndex);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => setActive(activeTabIndex), [activeTabIndex]);

  const { items, truncateFrom, empty } = tabs[active]!;
  const displayShowMoreButton =
    getShowMoreText && truncateFrom && items.length > truncateFrom;

  return (
    <div>
      <div css={headerStyles}>
        <div css={titleStyles}>
          <Headline3 styleAsHeading={5} noMargin>
            {title}
          </Headline3>
        </div>
        <div css={[descriptionStyles(description), overrideDescriptionStyles]}>
          {description}
        </div>
        <TabNav>
          {tabs.map(({ tabTitle, disabled }, index) => (
            <TabButton
              key={tabTitle}
              active={index === active}
              onClick={() => {
                setShowMore(false);
                setActive(index);
                onTabChange?.(index);
              }}
              disabled={disabled}
            >
              {tabTitle}
            </TabButton>
          ))}
        </TabNav>
      </div>
      <div>
        {items.length ? (
          children({
            data: items.slice(0, showMore ? undefined : truncateFrom),
          })
        ) : (
          <div css={emptyContainer}>{empty}</div>
        )}
      </div>
      {displayShowMoreButton && (
        <div css={showMoreStyles}>
          <Button linkStyle onClick={() => setShowMore(!showMore)}>
            {getShowMoreText(showMore)}
          </Button>
        </div>
      )}
    </div>
  );
};

export default TabbedContent;
