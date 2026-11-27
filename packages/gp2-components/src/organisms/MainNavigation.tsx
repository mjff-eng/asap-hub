import {
  mediaBelow,
  mediaFrom,
  pixels,
  tagSearchIcon,
} from '@asap-hub/react-components';
import { gp2 } from '@asap-hub/routing';
import { css } from '@emotion/react';
import React from 'react';
import {
  eventsIcon,
  outputsIcon,
  projectIcon,
  userIcon,
  workingGroupIcon,
} from '../icons';
import newsIcon from '../icons/news-icon';
import NavigationLink from '../molecules/NavigationLink';

const { workingGroups, users, projects, outputs, events, newsList, tags } = gp2;
const { rem } = pixels;

const listStyles = css({
  margin: '0',
  padding: '0',
  display: 'flex',
  flexDirection: 'row',
  listStyle: 'none',
  [mediaBelow.laptop]: {
    flexDirection: 'column',
    gap: 0,
    padding: rem(16),
  },
});

// Below the laptop breakpoint the tag search icon leaves the header and is a
// link in the menu; from laptop up it is the icon at the end of the header.
const menuOnlyStyles = css({
  [mediaFrom.laptop]: {
    display: 'none',
  },
});

const MainNavigation: React.FC = () => (
  <nav>
    <ul css={listStyles}>
      <li>
        <NavigationLink href={users({}).$} icon={userIcon}>
          People
        </NavigationLink>
      </li>
      <li>
        <NavigationLink
          href={workingGroups({}).$}
          icon={workingGroupIcon}
          enabled={true}
        >
          Groups
        </NavigationLink>
      </li>
      <li>
        <NavigationLink href={projects({}).$} icon={projectIcon}>
          Projects
        </NavigationLink>
      </li>
      <li>
        <NavigationLink href={outputs({}).$} icon={outputsIcon}>
          Outputs
        </NavigationLink>
      </li>
      <li>
        <NavigationLink href={events({}).$} icon={eventsIcon}>
          Events
        </NavigationLink>
      </li>
      <li>
        <NavigationLink href={newsList({}).$} icon={newsIcon}>
          News
        </NavigationLink>
      </li>
      <li css={menuOnlyStyles}>
        <NavigationLink href={tags({}).$} icon={tagSearchIcon}>
          Tags Search
        </NavigationLink>
      </li>
    </ul>
  </nav>
);

export default MainNavigation;
