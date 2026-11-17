import { colour, colourWithAlpha } from '@asap-hub/react-components/src/colors';

const white = colour.neutral[0];
const shade = (alpha: number): string =>
  colourWithAlpha(colour.neutral[900], alpha);

// Not in CAS, waiting on a design decision: CAS has no saturated violet, indigo,
// teal or pink, and each editor lane needs a hue of its own in both themes.
const lanes = {
  '--demo-editor-title': '#7660F0',
  '--demo-editor-zoom': '#5661F0',
  '--demo-editor-audio': '#26A092',
  '--demo-editor-banner': '#D75891',
  '--demo-editor-on-zoom': '#ECEAFE',
  '--demo-editor-on-audio': '#04201C',
  '--demo-editor-on-banner': '#2A0A18',
};

const darkLanes = {
  ...lanes,
  '--demo-editor-title': '#7B61FF',
  '--demo-editor-audio': '#2FB6A6',
  '--demo-editor-banner': '#E4679B',
};

export const lightTokens = {
  '--demo-paper': white,
  '--demo-on-dark': white,
  '--demo-pearl': colour.neutral[25],
  '--demo-silver': colour.general.blue.cerulean[25],
  '--demo-steel': colour.neutral[100],
  '--demo-tin': colour.neutral[200],
  '--demo-lead': colour.neutral[600],
  '--demo-charcoal': colour.neutral[900],

  '--demo-ember': colour.utilitarian.red[700],
  '--demo-rose': colour.utilitarian.red[50],

  '--demo-fern': colour.brand.crn[500],
  '--demo-pine': colour.brand.crn[800],
  '--demo-mint': colour.utilitarian.green[50],

  '--demo-cerulean': colour.brand.gp2[500],

  '--demo-info100': colour.brand.gp2[25],

  '--demo-warning100': colour.utilitarian.orange[2][100],
  '--demo-warning900': colour.utilitarian.orange[2][700],

  '--demo-overlay': shade(0.45),
  '--demo-shadow-soft': shade(0.12),
  '--demo-shadow-medium': shade(0.18),
  '--demo-shadow-strong': shade(0.3),

  '--demo-editor-surface': colour.neutral[25],
  '--demo-editor-panel': white,
  '--demo-editor-raised': colour.general.blue.cerulean[25],
  '--demo-editor-track': colour.general.blue.peacock[25],
  '--demo-editor-line': colour.general.blue.cerulean[50],
  '--demo-editor-text': colour.neutral[900],
  '--demo-editor-muted': colour.neutral[600],
  '--demo-editor-stage': colour.neutral[900],
  '--demo-editor-clip': colour.utilitarian.orange[400],
  '--demo-editor-clip-edge': colour.general.yellow[800],
  '--demo-editor-clip-text': colour.neutral[900],
  '--demo-editor-record': colour.utilitarian.red[600],
  '--demo-editor-playhead': colour.brand.gp2[600],
  '--demo-editor-selected': colour.neutral[900],
  '--demo-editor-on-accent': white,
  '--demo-editor-on-stage': colour.general.blue.classic[25],
  '--demo-editor-on-record': white,
  ...lanes,
};

// Not in CAS, waiting on a CAS dark theme: its darkest neutrals (900 and 800)
// are too few to keep the page, card, raised and border layers apart.
export const darkTokens = {
  '--demo-paper': '#16191C',
  '--demo-on-dark': white,
  '--demo-pearl': '#101214',
  '--demo-silver': '#212529',
  '--demo-steel': '#30363C',
  '--demo-tin': '#7A858E',
  '--demo-lead': '#A6B2BA',
  '--demo-charcoal': '#E6ECF0',

  '--demo-ember': '#F46A76',
  '--demo-rose': 'rgba(244, 106, 118, 0.16)',

  '--demo-fern': '#5ACA94',
  '--demo-pine': '#7ADBAA',
  '--demo-mint': 'rgba(90, 202, 148, 0.18)',

  '--demo-cerulean': '#54BAEA',

  '--demo-info100': 'rgba(84, 186, 234, 0.16)',

  '--demo-warning100': 'rgba(229, 165, 74, 0.16)',
  '--demo-warning900': '#F0BE78',

  '--demo-overlay': shade(0.65),
  '--demo-shadow-soft': shade(0.4),
  '--demo-shadow-medium': shade(0.5),
  '--demo-shadow-strong': shade(0.6),

  '--demo-editor-surface': '#0F1116',
  '--demo-editor-panel': '#161923',
  '--demo-editor-raised': '#1D212C',
  '--demo-editor-track': '#232838',
  '--demo-editor-line': '#2D3342',
  '--demo-editor-text': '#E9ECF3',
  '--demo-editor-muted': '#98A1B3',
  '--demo-editor-stage': '#0F1116',
  '--demo-editor-clip': '#E0A33C',
  '--demo-editor-clip-edge': '#F3C26B',
  '--demo-editor-clip-text': '#241A06',
  '--demo-editor-record': '#E5484D',
  '--demo-editor-playhead': '#5EB0FF',
  '--demo-editor-selected': white,
  '--demo-editor-on-accent': '#04121F',
  '--demo-editor-on-stage': '#E9ECF3',
  '--demo-editor-on-record': white,
  ...darkLanes,
};
