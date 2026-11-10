import { css } from '@emotion/react';
import { ReactNode, useEffect, useState } from 'react';

import { Button, Card, Headline3, Paragraph, TabButton } from '../atoms';
import { colour } from '../colors';
import { chevronDownIcon, chevronUpIcon } from '../icons';
import { rem } from '../pixels';
import TabNav from './TabNav';

const PADDING = 24;

const headerStyles = css({
  padding: PADDING,
});

const descriptionStyles = css({
  marginTop: rem(16),
});

const tabsStyles = css({
  marginTop: rem(16),
  padding: `0 ${rem(PADDING)}`,
  borderBottom: `1px solid ${colour.border.tertiary}`,
});

const bodyStyles = css({
  padding: `0 ${rem(PADDING)} ${rem(PADDING)}`,
});

const belowTabsStyles = css({
  paddingTop: rem(24),
});

const emptyStyles = css({
  padding: `0 ${rem(PADDING)} ${rem(PADDING)}`,
  fontWeight: 500,
});

const footerStyles = css({
  display: 'flex',
  justifyContent: 'center',
  padding: `${rem(16)} ${rem(PADDING)}`,
  borderTop: `1px solid ${colour.border.tertiary}`,
});

const showMoreLabelStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: rem(4),
  'svg g': { stroke: 'currentColor' },
});

export type MembershipCardTab<T> = {
  readonly tabTitle: string;
  readonly items: ReadonlyArray<T>;
  readonly empty: string;
  readonly disabled?: boolean;
};

type MembershipCardBaseProps<T> = {
  readonly title: string;
  readonly description: string;
  readonly truncateFrom?: number;
  readonly children: (state: {
    data: ReadonlyArray<T>;
    activeTabIndex: number;
  }) => ReactNode;
};

type MembershipCardTabbedProps<T> = MembershipCardBaseProps<T> & {
  readonly tabs: ReadonlyArray<MembershipCardTab<T>>;
  readonly activeTabIndex?: number;
  readonly onTabChange?: (index: number) => void;
  readonly items?: never;
  readonly empty?: never;
};

type MembershipCardSingleProps<T> = MembershipCardBaseProps<T> & {
  readonly items: ReadonlyArray<T>;
  readonly empty: string;
  readonly tabs?: never;
  readonly activeTabIndex?: never;
  readonly onTabChange?: never;
};

type MembershipCardProps<T> =
  | MembershipCardTabbedProps<T>
  | MembershipCardSingleProps<T>;

const MembershipCard = <T,>({
  title,
  description,
  tabs,
  items,
  empty,
  activeTabIndex = 0,
  onTabChange,
  truncateFrom = 5,
  children,
}: MembershipCardProps<T>) => {
  const [active, setActive] = useState(activeTabIndex);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => setActive(activeTabIndex), [activeTabIndex]);

  const activeTab = tabs ? tabs[active] ?? tabs[0] : undefined;
  const activeItems = activeTab?.items ?? items ?? [];
  const hasMore = activeItems.length > truncateFrom;
  const data = showMore ? activeItems : activeItems.slice(0, truncateFrom);
  const hasTabs = tabs !== undefined;

  return (
    <Card padding={false} title={title}>
      <div css={headerStyles}>
        <Headline3 noMargin>{title}</Headline3>
        <Paragraph noMargin accent="tertiary" styles={descriptionStyles}>
          {description}
        </Paragraph>
      </div>
      {tabs && (
        <div css={tabsStyles}>
          <TabNav>
            {tabs.map(({ tabTitle, disabled }, index) => (
              <TabButton
                key={index}
                active={index === active}
                disabled={disabled}
                onClick={() => {
                  setShowMore(false);
                  setActive(index);
                  onTabChange?.(index);
                }}
              >
                {tabTitle}
              </TabButton>
            ))}
          </TabNav>
        </div>
      )}
      {activeItems.length === 0 ? (
        <Paragraph
          noMargin
          styles={css([emptyStyles, hasTabs && belowTabsStyles])}
        >
          {activeTab?.empty ?? empty}
        </Paragraph>
      ) : (
        <div css={[bodyStyles, hasTabs && belowTabsStyles]}>
          {children({ data, activeTabIndex: active })}
        </div>
      )}
      {hasMore && (
        <div css={footerStyles}>
          <Button linkStyle onClick={() => setShowMore(!showMore)}>
            <span css={showMoreLabelStyles}>
              View {showMore ? 'Less' : 'More'}
              {showMore ? chevronUpIcon : chevronDownIcon}
            </span>
          </Button>
        </div>
      )}
    </Card>
  );
};

export default MembershipCard;
