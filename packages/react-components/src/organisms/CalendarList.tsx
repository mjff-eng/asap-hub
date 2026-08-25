import { css } from '@emotion/react';
import { BasicCalendarResponse } from '@asap-hub/model';
import { FC, useState } from 'react';

import { Card, Headline3, Paragraph, Link, Button } from '../atoms';
import { tabletScreen, rem } from '../pixels';
import { CalendarLink } from '../molecules';
import { neutral500 } from '../colors';

const containerStyles = css({
  display: 'grid',
  gridRowGap: rem(24),
});

const headerStyles = css({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: rem(33),
  marginLeft: rem(24),
  marginRight: rem(24),
});

const subheaderStyles = css({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: rem(24),
  marginLeft: rem(24),
  marginRight: rem(24),
  marginBottom: rem(33 - 12),
});

const dataGrid = css({
  display: 'inline-grid',
  width: '100%',
  gridTemplateRows: 'auto 12px auto',
  gridTemplateColumns: '1fr max-content',
  alignItems: 'center',
});
const gridText = css({
  gridColumn: '1',
  gridRow: '1 / span 2',
});
const gridButton = css({
  gridColumn: '1',
  gridRow: '2 / span 2',
  alignSelf: 'middle',
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    gridColumn: 'auto',
    gridRow: '1 / span 2',
  },
});

const orderList = css({
  listStyle: 'none',
  margin: 0,
  paddingLeft: rem(24),
  paddingRight: rem(24),
  li: {
    width: '100%',
    display: 'inline-flex',
  },
  '&> li + li': {
    [`@media (max-width: ${tabletScreen.min}px)`]: {
      marginTop: rem(12),
    },
    borderTop: `1px solid ${neutral500.rgb}`,
  },
});

const showMoreStyles = css({
  display: 'flex',
  justifyContent: 'center',
  paddingTop: rem(15),
  paddingBottom: rem(15),
  borderTop: `1px solid ${neutral500.rgb}`,
});

interface CalendarListProps {
  calendars: ReadonlyArray<BasicCalendarResponse>;
  title: string;
  description?: string;
  hideSupportText?: boolean;
}
const CalendarList: FC<CalendarListProps> = ({
  calendars,
  title,
  description,
  hideSupportText = false,
}) => {
  const truncateFrom = 5;
  const [showMore, setShowMore] = useState(false);
  const displayShowMoreButton = calendars.length > truncateFrom;

  return (
    <div css={containerStyles}>
      <Card padding={false}>
        <div css={headerStyles}>
          <Headline3 noMargin>{title}</Headline3>
        </div>
        {description && (
          <div css={subheaderStyles}>
            <Paragraph accent="neutral900" noMargin>
              {description}
            </Paragraph>
          </div>
        )}
        {!!calendars.length && (
          <ul
            css={[
              orderList,
              ...(!displayShowMoreButton ? [{ paddingBottom: rem(24) }] : []),
            ]}
          >
            {calendars
              .slice(0, showMore ? undefined : truncateFrom)
              .map(({ id, name, color }) => (
                <li key={id}>
                  <div css={dataGrid}>
                    <div css={gridText}>
                      <Paragraph accent="charcoal">
                        <span css={{ display: 'flex' }}>
                          <span css={{ color, paddingRight: rem(14) }}>●</span>
                          <span css={{ fontWeight: 'bold' }}>{name}</span>
                        </span>
                      </Paragraph>
                    </div>
                    <div css={gridButton}>
                      <CalendarLink id={id} />
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        )}
        {displayShowMoreButton && (
          <div css={showMoreStyles}>
            <Button linkStyle onClick={() => setShowMore(!showMore)}>
              View {showMore ? 'Less' : 'More'}
            </Button>
          </div>
        )}
      </Card>
      {!hideSupportText && (
        <Paragraph accent="neutral900">
          Having issues? Set up your calendar manually with these instructions
          for{' '}
          <Link href="https://support.apple.com/en-us/guide/calendar/icl1022/mac">
            Apple Calendar
          </Link>{' '}
          or{' '}
          <Link href="https://support.microsoft.com/en-us/office/import-or-subscribe-to-a-calendar-in-outlook-com-cff1429c-5af6-41ec-a5b4-74f2c278e98c">
            Outlook
          </Link>
          .
        </Paragraph>
      )}
    </div>
  );
};

export default CalendarList;
