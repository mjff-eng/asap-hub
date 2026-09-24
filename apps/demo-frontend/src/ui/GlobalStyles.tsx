import { Global } from '@emotion/react';
import { FC } from 'react';

import { charcoal, fontStyles, pearl, rem } from './theme';

export const lightTokens = {
  '--demo-paper': 'rgb(255, 255, 255)',
  '--demo-on-dark': 'rgb(255, 255, 255)',
  '--demo-pearl': 'rgb(252, 253, 254)',
  '--demo-silver': 'rgb(237, 241, 243)',
  '--demo-steel': 'rgb(223, 229, 234)',
  '--demo-tin': 'rgb(194, 201, 206)',
  '--demo-lead': 'rgb(77, 100, 107)',
  '--demo-charcoal': 'rgb(0, 34, 44)',

  '--demo-ember': 'rgb(205, 20, 38)',
  '--demo-rose': 'rgb(247, 232, 234)',

  '--demo-fern': 'rgb(52, 162, 112)',
  '--demo-pine': 'rgb(40, 121, 83)',
  '--demo-mint': 'rgb(228, 245, 238)',

  '--demo-cerulean': 'rgb(0, 140, 198)',

  '--demo-info100': 'rgb(230, 243, 249)',

  '--demo-warning100': 'rgb(248, 237, 222)',
  '--demo-warning900': 'rgb(181, 107, 11)',

  '--demo-overlay': 'rgba(0, 0, 0, 0.45)',
  '--demo-shadow-soft': 'rgba(0, 0, 0, 0.12)',
  '--demo-shadow-medium': 'rgba(0, 0, 0, 0.18)',
  '--demo-shadow-strong': 'rgba(0, 0, 0, 0.3)',

  // The studio chrome follows the app theme like every other page. The preview
  // stage stays a dark matte in both, the way every editor frames footage: a
  // bright surround changes how the picture itself reads.
  '--demo-editor-surface': 'rgb(247, 249, 251)',
  '--demo-editor-panel': 'rgb(255, 255, 255)',
  '--demo-editor-raised': 'rgb(243, 246, 249)',
  '--demo-editor-track': 'rgb(237, 241, 245)',
  '--demo-editor-line': 'rgb(219, 226, 232)',
  '--demo-editor-text': 'rgb(0, 34, 44)',
  '--demo-editor-muted': 'rgb(96, 116, 128)',
  '--demo-editor-stage': 'rgb(24, 27, 33)',
  '--demo-editor-clip': 'rgb(232, 168, 62)',
  '--demo-editor-clip-edge': 'rgb(180, 121, 24)',
  '--demo-editor-clip-text': 'rgb(43, 30, 6)',
  '--demo-editor-title': 'rgb(118, 96, 240)',
  '--demo-editor-zoom': 'rgb(86, 97, 240)',
  '--demo-editor-audio': 'rgb(38, 160, 146)',
  '--demo-editor-banner': 'rgb(215, 88, 145)',
  '--demo-editor-record': 'rgb(210, 48, 53)',
  '--demo-editor-playhead': 'rgb(0, 122, 204)',
  '--demo-editor-selected': 'rgb(0, 34, 44)',
  '--demo-editor-on-accent': 'rgb(255, 255, 255)',
  // text sitting on an accent that keeps its hue in both themes, so these keep
  // their value too: only the accent underneath decides what reads on it
  '--demo-editor-on-stage': 'rgb(233, 236, 243)',
  '--demo-editor-on-zoom': 'rgb(236, 234, 254)',
  '--demo-editor-on-audio': 'rgb(4, 32, 28)',
  '--demo-editor-on-banner': 'rgb(42, 10, 24)',
  '--demo-editor-on-record': 'rgb(255, 255, 255)',
};

export const darkTokens = {
  '--demo-paper': 'rgb(22, 25, 28)',
  '--demo-on-dark': 'rgb(255, 255, 255)',
  '--demo-pearl': 'rgb(16, 18, 20)',
  '--demo-silver': 'rgb(33, 37, 41)',
  '--demo-steel': 'rgb(48, 54, 60)',
  '--demo-tin': 'rgb(122, 133, 142)',
  '--demo-lead': 'rgb(166, 178, 186)',
  '--demo-charcoal': 'rgb(230, 236, 240)',

  '--demo-ember': 'rgb(244, 106, 118)',
  '--demo-rose': 'rgba(244, 106, 118, 0.16)',

  '--demo-fern': 'rgb(90, 202, 148)',
  '--demo-pine': 'rgb(122, 219, 170)',
  '--demo-mint': 'rgba(90, 202, 148, 0.18)',

  '--demo-cerulean': 'rgb(84, 186, 234)',

  '--demo-info100': 'rgba(84, 186, 234, 0.16)',

  '--demo-warning100': 'rgba(229, 165, 74, 0.16)',
  '--demo-warning900': 'rgb(240, 190, 120)',

  '--demo-overlay': 'rgba(0, 0, 0, 0.65)',
  '--demo-shadow-soft': 'rgba(0, 0, 0, 0.4)',
  '--demo-shadow-medium': 'rgba(0, 0, 0, 0.5)',
  '--demo-shadow-strong': 'rgba(0, 0, 0, 0.6)',

  '--demo-editor-surface': 'rgb(15, 17, 22)',
  '--demo-editor-panel': 'rgb(22, 25, 35)',
  '--demo-editor-raised': 'rgb(29, 33, 44)',
  '--demo-editor-track': 'rgb(35, 40, 56)',
  '--demo-editor-line': 'rgb(45, 51, 66)',
  '--demo-editor-text': 'rgb(233, 236, 243)',
  '--demo-editor-muted': 'rgb(152, 161, 179)',
  '--demo-editor-stage': 'rgb(15, 17, 22)',
  '--demo-editor-clip': 'rgb(224, 163, 60)',
  '--demo-editor-clip-edge': 'rgb(243, 194, 107)',
  '--demo-editor-clip-text': 'rgb(36, 26, 6)',
  '--demo-editor-title': 'rgb(123, 97, 255)',
  '--demo-editor-zoom': 'rgb(86, 97, 240)',
  '--demo-editor-audio': 'rgb(47, 182, 166)',
  '--demo-editor-banner': 'rgb(228, 103, 155)',
  '--demo-editor-record': 'rgb(229, 72, 77)',
  '--demo-editor-playhead': 'rgb(94, 176, 255)',
  '--demo-editor-selected': 'rgb(255, 255, 255)',
  '--demo-editor-on-accent': 'rgb(4, 18, 31)',
  '--demo-editor-on-stage': 'rgb(233, 236, 243)',
  '--demo-editor-on-zoom': 'rgb(236, 234, 254)',
  '--demo-editor-on-audio': 'rgb(4, 32, 28)',
  '--demo-editor-on-banner': 'rgb(42, 10, 24)',
  '--demo-editor-on-record': 'rgb(255, 255, 255)',
};

const styles = {
  ':root': { ...lightTokens, colorScheme: 'light' },
  "[data-theme='light']": { ...lightTokens, colorScheme: 'light' },
  "[data-theme='dark']": { ...darkTokens, colorScheme: 'dark' },
  '@media (prefers-color-scheme: dark)': {
    ":root:not([data-theme='light'])": { ...darkTokens, colorScheme: 'dark' },
  },
  '*, *::before, *::after': {
    boxSizing: 'border-box' as const,
  },
  html: {
    ...fontStyles,
    backgroundColor: pearl.rgb,
    color: charcoal.rgb,
  },
  'html, body, #root': {
    width: '100%',
    margin: 0,
    minHeight: '100%',
  },
  'h1, h2, h3, h4, h5, h6, p': {
    margin: 0,
  },
  p: {
    letterSpacing: rem(0.1),
  },
};

const GlobalStyles: FC = () => <Global styles={styles} />;

export default GlobalStyles;
