import { parse } from 'qs';
import { useLocation, useParams } from 'react-router';
import { RouteNode } from 'typesafe-routes';
import * as gp2 from './gp2';

export { default as about } from './about';
export { default as analytics } from './analytics';
export { default as compliance } from './compliance';
export { default as discover } from './discover';
export { default as events } from './events';
export { default as logout } from './logout';
export { default as network } from './network';
export type { OutputDocumentTypeParameter } from './network';
export { default as news } from './news';
export {
  default as projects,
  projectRouteByType,
  projectListRouteByType,
} from './projects';
export { default as sharedResearch } from './shared-research';
export { default as staticPages } from './static-pages';
export { default as welcome } from './welcome';
export { default as tags } from './tags';
export { default as dashboard } from './dashboard';

export type { RouteNode };
export { gp2 };

// copied and fixed from typesafe-routes/react-router
/* eslint-disable @typescript-eslint/no-explicit-any */
export const useRouteParams = <R extends RouteNode<string, any, any>>(
  route: R,
): ReturnType<R['parseParams']> => {
  const { search } = useLocation();
  return route.parseParams({
    ...useParams(),
    ...parse(search, { ignoreQueryPrefix: true }),
  }) as any;
};

// We could refactor this to use typesafe-routes even for the query params
export const searchQueryParam = 'searchQuery';
export const viewParam = 'view';
export const listViewValue = 'list';
