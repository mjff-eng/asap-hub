export { rem, lineHeight } from '@asap-hub/react-components/src/pixels';
export {
  fontStyles,
  captionStyles,
  headlineStyles,
  layoutStyles,
} from '@asap-hub/react-components/src/text';

export type ThemeColor = { readonly rgb: string };

const token = (name: string): ThemeColor => ({ rgb: `var(--demo-${name})` });

export const paper = token('paper');
// white that stays white: for text drawn on a surface that is dark in both
// themes, such as the player controls over the video
export const onDark = token('on-dark');
export const pearl = token('pearl');
export const silver = token('silver');
export const steel = token('steel');
export const tin = token('tin');
export const lead = token('lead');
export const charcoal = token('charcoal');

export const ember = token('ember');
export const rose = token('rose');

export const fern = token('fern');
export const pine = token('pine');
export const mint = token('mint');

export const cerulean = token('cerulean');

export const info100 = token('info100');

export const warning100 = token('warning100');
export const warning900 = token('warning900');

export const overlay = token('overlay');
export const shadowSoft = token('shadow-soft');
export const shadowMedium = token('shadow-medium');
export const shadowStrong = token('shadow-strong');
