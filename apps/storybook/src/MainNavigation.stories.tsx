import { ReactNode, useState } from 'react';
import { StaticRouter } from 'react-router';
import { colour, MainNavigation } from '@asap-hub/react-components';
import {
  about,
  discover,
  network,
  news,
  sharedResearch,
} from '@asap-hub/routing';

import { boolean, select } from './knobs';
import { NoPaddingDecorator } from './layout';

export default {
  title: 'Organisms / Navigation / Main Nav',
  component: MainNavigation,
  decorators: [NoPaddingDecorator],
};

// Match the real sidebar rail widths instead of stretching the full canvas.
const collapsedRailWidth = 72;
const expandedRailWidth = 268;

const RailFrame = ({
  collapsed,
  children,
}: {
  collapsed: boolean;
  children: ReactNode;
}) => (
  <div
    style={{
      width: collapsed ? collapsedRailWidth : expandedRailWidth,
      borderRight: `1px solid ${colour.border.tertiary}`,
      minHeight: '100vh',
      boxSizing: 'border-box',
      transition: 'width 250ms ease',
    }}
  >
    {children}
  </div>
);

const useActiveSection = () =>
  select(
    'Active Section',
    {
      Network: network({}).$,
      'Shared Research': sharedResearch({}).$,
      News: news({}).$,
      'Guides & Tutorials': discover({}).$,
      'About ASAP': about({}).$,
      None: '/none',
    },
    'network',
  );

export const Normal = () => {
  const path = useActiveSection();
  const canViewAnalytics = boolean('Can view analytics', true);
  const collapsible = boolean('Collapsible', true);
  const [collapsed, setCollapsed] = useState(false);
  return (
    <StaticRouter key={path} location={path}>
      <RailFrame collapsed={collapsed}>
        <MainNavigation
          userOnboarded={true}
          canViewAnalytics={canViewAnalytics}
          collapsed={collapsed}
          onToggleCollapse={
            collapsible ? () => setCollapsed((prev) => !prev) : undefined
          }
        />
      </RailFrame>
    </StaticRouter>
  );
};

// Icon-only rail: hover an item to see its tooltip; use the toggle to expand.
export const Collapsed = () => {
  const path = useActiveSection();
  const [collapsed, setCollapsed] = useState(true);
  return (
    <StaticRouter key={path} location={path}>
      <RailFrame collapsed={collapsed}>
        <MainNavigation
          userOnboarded={true}
          canViewAnalytics={boolean('Can view analytics', true)}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((prev) => !prev)}
        />
      </RailFrame>
    </StaticRouter>
  );
};

export const Disabled = () => (
  <RailFrame collapsed={false}>
    <MainNavigation userOnboarded={false} />
  </RailFrame>
);
