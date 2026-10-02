/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { css } from '@emotion/react';
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

const showMoreStyles = css({
  display: 'flex',
  justifyContent: 'center',
  borderTop: `1px solid ${colour.border.tertiary}`,
  paddingTop: rem(16),
  marginTop: rem(32),
});

const emptyContainer = css({
  paddingTop: rem(32),
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
  tabs: TabProps<T>[];
  activeTabIndex?: number;
  getShowMoreText?: (showMore: boolean) => string;
  children: (state: { data: T[] }) => ReactNode;
};

export const TabbedContent = <T extends object>({
  title,
  description,
  tabs,
  activeTabIndex = 0,
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
      <div css={[headerStyles]}>
        <div css={{ marginBottom: rem(24) }}>
          <Headline3 noMargin>{title}</Headline3>
        </div>
        {description}
        <TabNav>
          {tabs.map(({ tabTitle, disabled }, index) => (
            <TabButton
              key={tabTitle}
              active={index === active}
              onClick={() => {
                setShowMore(false);
                setActive(index);
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
