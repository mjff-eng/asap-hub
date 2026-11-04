import {
  ResearchOutputAssociations,
  ResearchOutputResponse,
  TeamMember,
} from '@asap-hub/model';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  googleDriveIcon,
  protocolsIcon,
  slackIcon,
  googleCalendarIcon,
} from '../icons';

/* istanbul ignore next */
// eslint-disable-next-line @typescript-eslint/no-empty-function
export const noop = (): void => {};

// Touch taps fire an emulated mouseenter right before the click, which would
// flash a hover-only affordance on mobile; only hover-capable pointers count.
export const canHover = (): boolean =>
  typeof window.matchMedia !== 'function' ||
  window.matchMedia('(hover: hover)').matches;

export const getSvgAspectRatio = (element: React.ReactElement): number => {
  const markup = renderToStaticMarkup(element);

  const container = document.createElement('div');
  container.innerHTML = markup;

  const svg = container.querySelector('svg');
  if (!svg) {
    throw new Error(
      'Failed to calculate SVG aspect ratio. Element does not contain an SVG.',
    );
  }
  const { width, height } = svg.viewBox.baseVal;
  return width / height;
};

export const isLink = (link: string = ''): boolean => {
  try {
    return Boolean(new URL(link));
  } catch (_) {
    return false;
  }
};

export const isInternalLink = (href: string): [boolean, string] => {
  if (globalThis.location) {
    try {
      const url = new URL(href, globalThis.location.href);
      if (url.origin === globalThis.location.origin) {
        return [true, `${url.pathname}${url.search}${url.hash}`];
      }

      return [false, url.toString()];
    } catch {
      return [false, ''];
    }
  }
  return [false, href];
};

const icons = Object.entries({
  '.slack.com': slackIcon,
  'protocols.io': protocolsIcon,
  'drive.google.com': googleDriveIcon,
  'calendar.google.com': googleCalendarIcon,
});

export const getIconFromUrl = (url: string): JSX.Element | undefined => {
  const icon = icons.find(([key]) => {
    try {
      const { host } = new URL(url);
      return host.endsWith(key);
    } catch {
      return false;
    }
  });
  return icon?.[1];
};

export function equals(a: Array<string>, b: Array<string>): boolean {
  return (
    a.length === b.length && a.every((element, index) => element === b[index])
  );
}

export const splitListBy = <T>(
  items: ReadonlyArray<T>,
  splitBy: (item: T) => boolean,
) =>
  items.reduce<[T[], T[]]>(
    (split, item) => {
      splitBy(item) ? split[0].push(item) : split[1].push(item);
      return split;
    },
    [[], []],
  );

// A team-based project output is shared through a team (publishingEntity is
// 'Team') but originates from a project workspace, so it carries the project
// link on its team rather than at the top level.
const isTeamBasedProjectOutput = (
  researchOutputData: Pick<ResearchOutputResponse, 'workingGroups' | 'teams'>,
): boolean =>
  !researchOutputData.workingGroups && !!researchOutputData.teams[0]?.project;

export const getResearchOutputAssociation = (
  researchOutputData: Pick<
    ResearchOutputResponse,
    'workingGroups' | 'teams' | 'publishingEntity'
  >,
): ResearchOutputAssociations => {
  if (
    researchOutputData.publishingEntity === 'Project' ||
    isTeamBasedProjectOutput(researchOutputData)
  ) {
    return 'project';
  }

  return researchOutputData.workingGroups
    ? 'working group'
    : `team${researchOutputData.teams.length > 1 ? 's' : ''}`;
};

export const getResearchOutputAssociationName = (
  researchOutputData: Pick<
    ResearchOutputResponse,
    'workingGroups' | 'teams' | 'project' | 'publishingEntity'
  >,
): string => {
  if (researchOutputData.publishingEntity === 'Project') {
    return researchOutputData.project?.title || '';
  }

  if (researchOutputData.workingGroups) {
    return researchOutputData.workingGroups[0].title;
  }

  if (isTeamBasedProjectOutput(researchOutputData)) {
    return researchOutputData.teams[0]?.project?.title || '';
  }

  return researchOutputData.teams[0]?.displayName || '';
};

// Capitalised association label used for the pill on research output cards.
export const getResearchOutputAssociationPill = (
  researchOutputData: Pick<
    ResearchOutputResponse,
    'workingGroups' | 'teams' | 'publishingEntity'
  >,
): 'Working Group' | 'Project' | 'Team' => {
  switch (getResearchOutputAssociation(researchOutputData)) {
    case 'working group':
      return 'Working Group';
    case 'project':
      return 'Project';
    default:
      return 'Team';
  }
};

// Get the active Project Manager from a list of team members
export const getActiveProjectManager = (
  members: ReadonlyArray<TeamMember>,
): TeamMember | undefined =>
  members.find(
    (member) =>
      member.role === 'Project Manager' &&
      !member.alumniSinceDate &&
      !member.inactiveSinceDate,
  );

// Clamp a percentage value into the 0–100 range.
export const clampPercentage = (value: number): number =>
  Math.min(100, Math.max(0, value));

/**
 * Triggers a download of the given blob in the browser.
 * @param blob The content to download.
 * @param filename The name the browser saves the file as.
 */
export const triggerDownloadFile = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  // Defer so the click-triggered download can read the blob before the URL is
  // revoked (a synchronous revoke cancels it in Firefox/Safari).
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
