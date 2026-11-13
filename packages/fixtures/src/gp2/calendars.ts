import { gp2, googleLegacyCalendarColor } from '@asap-hub/model';

export const createCalendarResponse = (
  itemIndex = 0,
  overrides: Partial<gp2.CalendarResponse> = {},
): gp2.CalendarResponse => ({
  id: `calendar-${itemIndex}`,
  color:
    googleLegacyCalendarColor[itemIndex % googleLegacyCalendarColor.length],
  name: `Calendar ${itemIndex}`,
  projects: [],
  workingGroups: [],
  gp2Calendar: false,
  ...overrides,
});

export const createListCalendarResponse = (
  items: number = 1,
  overrides: Partial<gp2.CalendarResponse> = {},
): gp2.ListCalendarResponse => ({
  total: items,
  items: Array.from({ length: items }, (_, itemIndex) =>
    createCalendarResponse(itemIndex, overrides),
  ),
});
