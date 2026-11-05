export {
  getUserClaimKey,
  useCurrentUserCRN,
  useCurrentUserGP2,
  useCurrentUserRoleGP2,
  useCurrentUserTeamRolesCRN,
} from './auth';
export {
  Auth0ContextCRN,
  Auth0ContextGP2,
  useAuth0CRN,
  useAuth0GP2,
} from './auth0';
// Auth0SpaProvider/createAuthProvider are deliberately not re-exported here:
// they pull in @auth0/auth0-spa-js, which would end up in the apps' entry
// chunks via this barrel. Import them from their module path instead so they
// stay in the lazy-loaded AuthProvider chunk.
export { FlagsContext, LiveFlagsProvider, useFlags } from './flags';
export {
  ResearchOutputPermissionsContext,
  getVisibleResearchOutputActions,
  resolveResearchOutputAvailableActions,
} from './permissions/research-output';
export type {
  ResearchOutputAvailableActions,
  ResearchOutputDetailActionAvailability,
  ResearchOutputPermissions,
} from './permissions/research-output';
export { ToastContext, InnerToastContext } from './toast';
export {
  useNotificationContext,
  NotificationContext,
} from './notification-message';
export type { Notification, Page } from './notification-message';
export { useScrollToTop, ScrollContext } from './scroll';
export { UserProfileContext, useUserProfileContext } from './user-profile';
