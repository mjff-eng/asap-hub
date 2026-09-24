import {
  casPrimitives,
  casTheme,
  colors,
  cssColour,
} from '@asap-hub/react-components';

export { cssColour };

export type Product = keyof typeof casTheme;

export interface ThemeToken {
  figmaName: string;
  codeName: string;
  cssVariable: string;
  crn: { hex: string; alpha: number; alias?: string };
  gp2: { hex: string; alpha: number; alias?: string };
}

export interface Primitive {
  figmaName: string;
  codeName: string;
  step: string;
  hex: string;
  alpha: number;
}

const toHex = (channels: readonly number[]): string =>
  `#${channels
    .slice(0, 3)
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;

const codeNameFor = (path: string[]): string =>
  path
    .map((segment, index) => {
      if (index === 0) return segment;
      if (/^\d+$/.test(segment)) return `[${segment}]`;
      if (/^[a-z]+$/i.test(segment)) return `.${segment}`;
      return `['${segment}']`;
    })
    .join('');

const flattenPrimitives = (node: unknown, path: string[]): Primitive[] =>
  Array.isArray(node)
    ? [
        {
          figmaName: path.join('/'),
          codeName: codeNameFor(path),
          step: path[path.length - 1] as string,
          hex: toHex(node),
          alpha: (node[3] as number | undefined) ?? 1,
        },
      ]
    : Object.entries(node as Record<string, unknown>).flatMap(([key, child]) =>
        flattenPrimitives(child, [...path, key]),
      );

export const primitives = flattenPrimitives(casPrimitives, ['colour']);

export const primitiveRamps = primitives.reduce<
  { ramp: string; steps: Primitive[] }[]
>((ramps, primitive) => {
  const ramp = primitive.figmaName.split('/').slice(0, -1).join('/');
  const last = ramps[ramps.length - 1];
  if (last && last.ramp === ramp) last.steps.push(primitive);
  else ramps.push({ ramp, steps: [primitive] });
  return ramps;
}, []);

export const themeTokens: ThemeToken[] = Object.entries(casTheme.crn).map(
  ([figmaName, crn]) => {
    const path = figmaName.split('/');
    return {
      figmaName,
      codeName: codeNameFor(path),
      cssVariable: `--${path.join('-')}`,
      crn,
      gp2: casTheme.gp2[figmaName as keyof typeof casTheme.gp2],
    };
  },
);

export const themeTokensByPrimitive = themeTokens.reduce<Map<string, string[]>>(
  (byPrimitive, token) => {
    new Set([token.crn.alias, token.gp2.alias]).forEach((alias) => {
      if (!alias) return;
      const names = byPrimitive.get(alias) ?? [];
      if (!names.includes(token.figmaName)) names.push(token.figmaName);
      byPrimitive.set(alias, names);
    });
    return byPrimitive;
  },
  new Map(),
);

const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrast = (foreground: string, background: string): number => {
  const [light, dark] = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  ) as [number, number];
  return Math.round(((light + 0.05) / (dark + 0.05)) * 100) / 100;
};

export const themeHex = (figmaName: string, product: Product = 'crn') =>
  casTheme[product][figmaName as keyof (typeof casTheme)['crn']].hex;

export const legacyNamesByHex = (() => {
  const names = new Map<string, string[]>();
  Object.entries(colors).forEach(([name, value]) => {
    const c = value as { r?: number; g?: number; b?: number; a?: number };
    if (typeof c?.r !== 'number' || c.a !== undefined) return;
    const hex = toHex([c.r, c.g as number, c.b as number]);
    names.set(hex, [...(names.get(hex) ?? []), name]);
  });
  return names;
})();

export const legacyHex = (name: string): string => {
  const c = (
    colors as unknown as Record<string, { r: number; g: number; b: number }>
  )[name];
  return c ? toHex([c.r, c.g, c.b]) : '';
};

type LegacyStatus = 'ready' | 'changes' | 'design';

export interface LegacyName {
  name: string;
  before: string;
  replacement?: string;
  status: LegacyStatus;
  note?: string;
}

// `before` is the value on master before the CAS work started
export const legacyNames: LegacyName[] = [
  {
    name: 'charcoal',
    before: '#00222C',
    replacement: 'colour.foreground.primary',
    status: 'ready',
  },
  {
    name: 'neutral1000',
    before: '#00202C',
    replacement: 'colour.foreground.primary',
    status: 'ready',
  },
  {
    name: 'pearl',
    before: '#FCFDFE',
    replacement: 'colour.background.secondary',
    status: 'ready',
  },
  {
    name: 'neutral300',
    before: '#EDF1F3',
    replacement: 'colour.background.tertiary',
    status: 'ready',
  },
  {
    name: 'neutral500',
    before: '#DFE5EA',
    replacement:
      'colour.border.tertiary (borders), colour.background.hover (backgrounds)',
    status: 'ready',
  },
  {
    name: 'neutral700',
    before: '#C2C9CE',
    replacement: 'colour.border.secondary',
    status: 'ready',
  },
  {
    name: 'error100',
    before: '#F7E8EA',
    replacement: 'colour.background.error',
    status: 'ready',
  },
  {
    name: 'error500',
    before: '#CD1426',
    replacement: 'colour.foreground.error, colour.border.error',
    status: 'ready',
  },
  {
    name: 'error900',
    before: '#B00A1A',
    replacement: 'colour.background.button.utilitarian.error.hover',
    status: 'ready',
  },
  {
    name: 'warning150',
    before: '#F2E1CB',
    replacement: 'colour.background.warning',
    status: 'ready',
  },
  {
    name: 'warning500',
    before: '#CE801A',
    replacement: 'colour.foreground.warning, colour.border.warning',
    status: 'ready',
  },
  {
    name: 'warning900',
    before: '#B56B0B',
    replacement: 'colour.background.button.utilitarian.warning.hover',
    status: 'ready',
  },
  {
    name: 'neutral200',
    before: '#F6F9FB',
    replacement: 'colour.background.secondary',
    status: 'changes',
    note: '#FAFAFA becomes #FCFCFD',
  },
  {
    name: 'warning100',
    before: '#F8EDDE',
    replacement: 'colour.background.warning',
    status: 'changes',
    note: 'orange 50 becomes orange 100',
  },
  {
    name: 'neutral900',
    before: '#4D646B',
    status: 'design',
    note: 'question 1',
  },
  {
    name: 'neutral800',
    before: '#92999E',
    status: 'design',
    note: 'question 1',
  },
  {
    name: 'success100',
    before: '#E4F5EE',
    status: 'design',
    note: 'question 2',
  },
  {
    name: 'success500',
    before: '#34A270',
    status: 'design',
    note: 'question 2',
  },
  {
    name: 'success900',
    before: '#287953',
    status: 'design',
    note: 'question 2',
  },
  { name: 'info100', before: '#E6F3F9', status: 'design', note: 'question 2' },
  { name: 'info150', before: '#C0DFED', status: 'design', note: 'question 2' },
  {
    name: 'info200',
    before: '#BFE3D3',
    status: 'design',
    note: 'question 2 (a green named info)',
  },
  { name: 'info500', before: '#0C8DC3', status: 'design', note: 'question 2' },
  { name: 'info900', before: '#006A92', status: 'design', note: 'question 2' },
  {
    name: 'information100',
    before: '#E6F3F9',
    status: 'design',
    note: 'question 2',
  },
  {
    name: 'information500',
    before: '#0C8DC3',
    status: 'design',
    note: 'question 2',
  },
  {
    name: 'information900',
    before: '#006A92',
    status: 'design',
    note: 'question 2',
  },
  { name: 'cerulean', before: '#008CC6', status: 'design', note: 'question 3' },
  { name: 'space', before: '#004561', status: 'design', note: 'question 3' },
  { name: 'azure', before: '#E7F7FE', status: 'design', note: 'question 3' },
  { name: 'magenta', before: '#CF2FB3', status: 'design', note: 'question 3' },
  { name: 'berry', before: '#9A2386', status: 'design', note: 'question 3' },
  { name: 'lilac', before: '#F8EAF7', status: 'design', note: 'question 3' },
  { name: 'iris', before: '#8C4E9F', status: 'design', note: 'question 3' },
  { name: 'mauve', before: '#693B77', status: 'design', note: 'question 3' },
  { name: 'lavender', before: '#F2EDF5', status: 'design', note: 'question 3' },
];
