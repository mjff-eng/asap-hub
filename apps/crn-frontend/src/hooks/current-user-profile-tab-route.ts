import { useCurrentUserCRN } from '@asap-hub/react-context';
import { network } from '@asap-hub/routing';
import { relative } from 'path';
import { useLocation } from 'react-router';

export const useCurrentUserProfileTabRoute = () => {
  const user = useCurrentUserCRN();
  const { pathname } = useLocation();
  if (!user) {
    return undefined;
  }
  const route = network({}).users({}).user;
  const tabRoutes = route({ userId: user.id });
  return [
    tabRoutes.about,
    tabRoutes.research,
    tabRoutes.overview,
    tabRoutes.outputs,
  ].find(
    (possibleTabRoute) =>
      !relative(possibleTabRoute({}).$, pathname).startsWith('..'),
  );
};
