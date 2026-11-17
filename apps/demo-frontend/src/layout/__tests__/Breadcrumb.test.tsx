import { screen, waitFor } from '@testing-library/react';

import type { Folder } from '../../api/types';
import { makeVideo, memberMe, renderApp } from '../../test-utils';
import Breadcrumb from '../Breadcrumb';

const folders: Folder[] = [
  { id: 'ROOT', name: 'Root' },
  { id: 'f-eng', name: 'Engineering' },
  { id: 'f-sprint', name: 'Sprints', parentId: 'f-eng' },
  { id: 'f-deep', name: 'Deep', parentId: 'f-sprint' },
];

const video = makeVideo({ title: 'Sprint 42 demo', folderId: 'f-eng' });

const api = {
  listFolders: () => Promise.resolve(folders),
  getVideo: () => Promise.resolve(video),
};

const renderCrumbs = (route: string, routePath = route.split('?')[0]) =>
  renderApp(<Breadcrumb />, { api, me: memberMe, route, routePath });

const crumbLabels = () =>
  Array.from(
    screen.getByRole('navigation', { name: 'Breadcrumb' }).children,
  ).map((node) => node.textContent);

it('renders nothing on Home, where Demos is the only crumb', async () => {
  renderCrumbs('/');

  await waitFor(() =>
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).toBeNull(),
  );
});

it('names the folder in the url after Demos', async () => {
  renderCrumbs('/?folder=f-eng');

  await screen.findByRole('navigation', { name: 'Breadcrumb' });
  expect(crumbLabels()).toEqual(['Demos', '/Engineering']);
  expect(screen.getByRole('link', { name: 'Demos' })).toHaveAttribute(
    'href',
    '/',
  );
  expect(screen.getByText('Engineering')).toHaveAttribute(
    'aria-current',
    'page',
  );
});

it('names every ancestor of a nested folder', async () => {
  renderCrumbs('/?folder=f-deep');

  await screen.findByRole('navigation', { name: 'Breadcrumb' });
  expect(crumbLabels()).toEqual(['Demos', '/Engineering', '/Sprints', '/Deep']);
  expect(screen.getByRole('link', { name: 'Sprints' })).toHaveAttribute(
    'href',
    '/?folder=f-sprint',
  );
  expect(screen.getByText('Deep')).toHaveAttribute('aria-current', 'page');
});

it('walks the folder path on a watch page too', async () => {
  renderCrumbs('/videos/video-1', '/videos/:id');

  await screen.findByText('Sprint 42 demo');
  expect(crumbLabels()).toEqual(['Demos', '/Engineering', '/Sprint 42 demo']);
});

it('skips the synthetic ROOT folder', async () => {
  renderCrumbs('/?folder=ROOT');

  await waitFor(() =>
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).toBeNull(),
  );
});

it('shows the all-videos crumb', async () => {
  renderCrumbs('/?view=all');

  await screen.findByRole('navigation', { name: 'Breadcrumb' });
  expect(crumbLabels()).toEqual(['Demos', '/All videos']);
});

it('shows the folder then the title on a watch page', async () => {
  renderCrumbs('/videos/video-1', '/videos/:id');

  await screen.findByText('Sprint 42 demo');
  expect(crumbLabels()).toEqual(['Demos', '/Engineering', '/Sprint 42 demo']);
  expect(screen.getByRole('link', { name: 'Engineering' })).toHaveAttribute(
    'href',
    '/?folder=f-eng',
  );
});

it.each([
  ['/invites', 'Invites'],
  ['/users', 'Users'],
  ['/studio/upload', 'Studio'],
])('names the %s page', async (route, label) => {
  renderCrumbs(route);

  await screen.findByRole('navigation', { name: 'Breadcrumb' });
  expect(crumbLabels()).toEqual(['Demos', `/${label}`]);
});
