import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';

import { makeVideo, memberMe, renderApp } from '../../test-utils';
import NotFound from '../../pages/NotFound';
import Layout from '../Layout';

const api = {
  listFolders: () => Promise.resolve([]),
  getVideo: () => Promise.resolve(makeVideo()),
};

it('wraps the routed page in the header, breadcrumb and main shell', async () => {
  renderApp(
    <Routes>
      <Route element={<Layout />}>
        <Route path="/users" element={<div>routed page</div>} />
      </Route>
    </Routes>,
    { api, me: memberMe, route: '/users', routePath: '*' },
  );

  expect(await screen.findByRole('banner')).toBeVisible();
  expect(screen.getByRole('main')).toBeVisible();
  expect(screen.getByText('routed page')).toBeVisible();
  expect(
    await screen.findByRole('navigation', { name: 'Breadcrumb' }),
  ).toBeVisible();
});

it('renders the not found page for an unknown route', async () => {
  renderApp(
    <Routes>
      <Route element={<Layout />}>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>,
    { api, me: memberMe, route: '/nowhere', routePath: '*' },
  );

  expect(await screen.findByText('Page not found')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Back to demos' })).toHaveAttribute(
    'href',
    '/',
  );
});
