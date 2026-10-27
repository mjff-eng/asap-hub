import { createContext, FC, ReactNode, useContext, useMemo } from 'react';

import { useAuth } from '../auth/AuthProvider';
import { Api, createApi } from './client';

const ApiContext = createContext<Api | undefined>(undefined);

export const useApi = (): Api => {
  const api = useContext(ApiContext);
  if (!api) throw new Error('ApiProvider is missing');
  return api;
};

export const ApiProvider: FC<{ readonly children: ReactNode }> = ({
  children,
}) => {
  const { getToken } = useAuth();
  const api = useMemo(() => createApi(getToken), [getToken]);
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
};

export const TestApiProvider: FC<{
  readonly api: Partial<Api>;
  readonly children: ReactNode;
}> = ({ api, children }) => (
  <ApiContext.Provider value={api as Api}>{children}</ApiContext.Provider>
);
