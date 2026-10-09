import { DashboardResponse, ListReminderResponse } from '@asap-hub/model';
import { useFlags } from '@asap-hub/react-context';
import { useSuspenseQuery } from '@tanstack/react-query';

import { useAuthorization } from '../auth/useAuthorization';
import { getDashboard, getReminders } from './api';

// Both fetches share the 'dashboard' key root — invalidating it refreshes
// both.
export const dashboardQueryKeys = {
  all: ['dashboard'] as const,
  data: () => [...dashboardQueryKeys.all, 'data'] as const,
  reminders: () => [...dashboardQueryKeys.all, 'reminders'] as const,
};

export const useDashboardState = (): DashboardResponse => {
  const getAuthorization = useAuthorization();
  return useSuspenseQuery({
    queryKey: dashboardQueryKeys.data(),
    queryFn: async () => getDashboard(await getAuthorization()),
  }).data;
};

export const useReminderState = (): ListReminderResponse => {
  const getAuthorization = useAuthorization();
  const { isEnabled } = useFlags();
  const isNewEventPageEnabled = isEnabled('NEW_EVENT_PAGE');
  return useSuspenseQuery({
    queryKey: [...dashboardQueryKeys.reminders(), { isNewEventPageEnabled }],
    queryFn: async () =>
      getReminders(await getAuthorization(), { isNewEventPageEnabled }),
  }).data;
};
