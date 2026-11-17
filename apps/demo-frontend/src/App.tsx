import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FC } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';

import { ApiProvider } from './api/ApiProvider';
import AuthGate from './auth/AuthGate';
import AuthProvider from './auth/AuthProvider';
import Layout from './layout/Layout';
import Home from './pages/Home';
import Invites from './pages/Invites';
import NotFound from './pages/NotFound';
import StudioUpload from './pages/StudioUpload';
import StudioProject from './pages/StudioProject';
import StudioVideo from './pages/StudioVideo';
import Users from './pages/Users';
import Watch from './pages/Watch';
import GlobalStyles from './ui/GlobalStyles';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const App: FC = () => (
  <BrowserRouter>
    <GlobalStyles />
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <ApiProvider>
          <AuthGate>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/videos/:id" element={<Watch />} />
                <Route path="/invites" element={<Invites />} />
                <Route path="/users" element={<Users />} />
                <Route path="/studio/upload" element={<StudioUpload />} />
                <Route path="/studio/videos/:id" element={<StudioVideo />} />
                <Route
                  path="/studio/projects/:id"
                  element={<StudioProject />}
                />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </AuthGate>
        </ApiProvider>
      </QueryClientProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
