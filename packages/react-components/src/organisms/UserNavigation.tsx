import { css } from '@emotion/react';
import { ProjectType } from '@asap-hub/model';
import { logout, staticPages } from '@asap-hub/routing';

import { rem } from '../pixels';
import { Divider, NavigationLink, Caption, Anchor } from '../atoms';
import { UserIcon, feedbackIcon, logoutIcon } from '../icons';
import { mailToFeedback } from '../mail';
import { UserNavigationAssociationSection } from '../molecules';
import { MAX_NAVIGATION_MENU_WIDTH, drawerQuery } from '../layout';
import { getProjectIcon } from '../utils';

const containerStyles = css({
  width: '100%',
  maxWidth: rem(MAX_NAVIGATION_MENU_WIDTH),
  height: '100%',

  display: 'flex',
  flexDirection: 'column',

  boxSizing: 'border-box',
  padding: rem(24),
});

const listStyles = css({
  listStyle: 'none',
  margin: 0,
  padding: 0,
});

const dividerStyle = css({
  display: 'block',
  marginLeft: rem(12),
  marginRight: rem(12),
});

const bottomLinksStyles = css({
  flexGrow: 1,

  display: 'flex',
  alignItems: 'flex-end',
  padding: `${rem(12)} ${rem(12)} 0`,
  // Grey space below the footer links in the mobile drawer, so the fixed
  // cookie button has room and doesn't sit over them.
  [drawerQuery]: {
    paddingBottom: rem(80),
  },
});

export interface UserNavigationProps {
  readonly userOnboarded?: boolean;
  readonly userProfileHref: string;
  readonly teams: ReadonlyArray<{ name: string; href: string }>;
  readonly projects?: ReadonlyArray<{
    name: string;
    href: string;
    projectType: ProjectType;
  }>;
  readonly workingGroups: ReadonlyArray<{
    name: string;
    href: string;
    active: boolean;
  }>;
  readonly interestGroups: ReadonlyArray<{
    name: string;
    href: string;
    active: boolean;
  }>;
  readonly aboutHref: string;
}
const UserNavigation: React.FC<UserNavigationProps> = ({
  userOnboarded = true,
  userProfileHref,
  teams,
  projects,
  workingGroups,
  interestGroups,
  aboutHref,
}) => (
  <nav css={containerStyles}>
    <ul css={listStyles}>
      <li>
        <NavigationLink href={userProfileHref} icon={<UserIcon />}>
          My Profile
        </NavigationLink>
      </li>
      {projects && projects.length > 0 && (
        <UserNavigationAssociationSection
          userOnboarded={userOnboarded}
          association={projects.map((project) => ({
            ...project,
            icon: getProjectIcon(project.projectType),
          }))}
          title="MY PROJECTS"
        />
      )}
      <UserNavigationAssociationSection
        userOnboarded={userOnboarded}
        association={teams}
        title="MY TEAMS"
      />
      {interestGroups.length > 0 &&
        interestGroups.some((interestGroup) => interestGroup.active) && (
          <UserNavigationAssociationSection
            userOnboarded={userOnboarded}
            association={interestGroups}
            title="MY INTEREST GROUPS"
          />
        )}
      {workingGroups.length > 0 &&
        workingGroups.some((workingGroup) => workingGroup.active) && (
          <UserNavigationAssociationSection
            userOnboarded={userOnboarded}
            association={workingGroups}
            title="MY WORKING GROUPS"
          />
        )}
    </ul>
    <span css={dividerStyle}>
      <Divider />
    </span>
    <ul css={listStyles}>
      {/* settings could go here */}
      <li>
        <NavigationLink href={mailToFeedback()} icon={feedbackIcon}>
          Give Feedback
        </NavigationLink>
      </li>
      <li>
        <NavigationLink href={logout({}).$} icon={logoutIcon}>
          Log Out
        </NavigationLink>
      </li>
    </ul>
    <div css={bottomLinksStyles}>
      <Caption accent="tertiary" asParagraph>
        <Anchor href={staticPages({}).terms({}).$}>Terms of Use</Anchor>
        {'  ·  '}
        <Anchor href={staticPages({}).privacyPolicy({}).$}>
          Privacy Notice
        </Anchor>
        {'  ·  '}
        <Anchor href={aboutHref}>About ASAP</Anchor>
      </Caption>
    </div>
  </nav>
);

export default UserNavigation;
