import { createElement, Fragment, ReactNode } from 'react';

import { casTextStyles } from '../cas-tokens.generated';
import {
  isTextChildren,
  assertIsTextChildren,
  isAllowedChildren,
  fontStyles,
  headlineStyles,
} from '../text';

describe('fontStyles', () => {
  it('sizes the text in rem so it follows the browser font size', () => {
    expect(fontStyles.fontSize).toBe('1rem');
  });
  it('uses a unitless line height', () => {
    expect(fontStyles.lineHeight).toBe(1.5);
  });
});

describe.each([2, 3, 4, 5, 6] as const)('headlineStyles[%i]', (level) => {
  const { fontSize, lineHeight } = casTextStyles.heading[level].bold;
  it('sizes the text in rem so it follows the browser font size', () => {
    expect(headlineStyles[level].fontSize).toBe(`${fontSize / 16}rem`);
  });
  it('uses a unitless line height', () => {
    expect(headlineStyles[level].lineHeight).toBeCloseTo(lineHeight / fontSize);
  });
});

describe.each([
  [undefined],
  [null],
  [false],
  [true],
  [''],
  ['text'],
  [42],
  [[]],
  [['text']],
  [[[false, 42], 'text']],
])('for the text children %p', (children) => {
  describe('isTextChildren', () => {
    it('returns true', () => {
      expect(isTextChildren(children)).toBe(true);
    });
  });
  describe('assertIsTextChildren', () => {
    it('passes', () => {
      expect(() => assertIsTextChildren(children)).not.toThrow();
    });
  });
});

describe.each([
  [{}],
  [Symbol('Forbidden primitive type')],
  [createElement('div')],
  [createElement(Fragment, { children: {} as ReactNode })],
])('for the children %p', (children) => {
  describe('isTextChildren', () => {
    it('returns false', () => {
      expect(isTextChildren(children)).toBe(false);
    });
  });
  describe('assertIsTextChildren', () => {
    it('throws', () => {
      expect(() => assertIsTextChildren(children)).toThrow(/expected.+text/i);
    });
  });
});

describe.each([
  [undefined],
  [null],
  [false],
  [true],
  [''],
  ['text'],
  [42],
  [[]],
  [['text']],
  [[[false, 42], 'text']],
  [createElement('i')],
  [createElement('em')],
  [createElement('u')],
  [createElement('i', { children: ['Italic Text'] })],
])('for the allowed children %p', (children) => {
  describe('isAllowedChildren', () => {
    it('returns true', () => {
      expect(isAllowedChildren(children)).toBe(true);
    });
  });
});

describe.each([
  [{}],
  [Symbol('Forbidden primitive type')],
  [createElement('div')],
  [createElement('i', { children: [createElement('div')] })],
  [createElement(Fragment, { children: {} as ReactNode })],
])('for the children %p', (children) => {
  describe('isAllowedChildren', () => {
    it('returns false', () => {
      expect(isAllowedChildren(children)).toBe(false);
    });
  });
});
