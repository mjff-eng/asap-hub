import { createContext, useContext } from 'react';

import type { Me } from '../api/types';

export const MeContext = createContext<Me | undefined>(undefined);

export const useMeContext = (): Me => {
  const me = useContext(MeContext);
  if (!me) throw new Error('MeContext is missing');
  return me;
};

export const useIsAdmin = (): boolean => useMeContext().role === 'admin';

// an admin passes every creator check on top of managing users
export const useIsCreator = (): boolean => {
  const { role } = useMeContext();
  return role === 'creator' || role === 'admin';
};
