import { css } from '@emotion/react';
import { calendarIcon } from '../icons';
import { rem } from '../pixels';
import { Display, Link, Paragraph, colour } from '..';

const wrapperStyle = css({
  textAlign: 'center',
});

const iconStyles = css({
  svg: {
    width: rem(48),
    height: rem(48),
    stroke: colour.foreground.primary,
  },
});

const NoEvents: React.FC<{
  past?: boolean;
  link: string;
  type: 'team' | 'interest group' | 'working group' | 'member';
}> = ({ past, link, type }) => {
  const eventPeriod = past ? 'Past' : 'Upcoming';
  const lowerEventPeriod = eventPeriod.toLocaleLowerCase();

  return (
    <main css={wrapperStyle}>
      <span css={iconStyles}>{calendarIcon}</span>
      <Display styleAsHeading={3}>
        This {type} doesn’t have any {lowerEventPeriod} events!
      </Display>
      <Paragraph accent="tertiary">
        In the meantime, try exploring other {lowerEventPeriod} events on the
        Hub.
      </Paragraph>
      <Link href={link} buttonStyle primary>
        {`Explore ${eventPeriod} Events`}
      </Link>
    </main>
  );
};

export default NoEvents;
