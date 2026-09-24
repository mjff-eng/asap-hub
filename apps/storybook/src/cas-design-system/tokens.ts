import { cssColour } from '@asap-hub/react-components';
import { casPrimitives, casTheme } from '@asap-hub/react-components/cas-tokens';

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

const primitiveHexByPath = new Map(
  primitives.map((primitive) => [primitive.figmaName, primitive.hex]),
);

// resolves a code name such as `foreground.primary`, `background['hover-brand']`
// or `neutral[900]` to its CRN value
export const casHex = (codePath: string, product: Product = 'crn'): string => {
  const path = codePath
    .replace(/\['([^']+)'\]/g, '/$1')
    .replace(/\[(\d+)\]/g, '/$1')
    .replace(/\./g, '/');
  return /^(foreground|background|border)\//.test(path)
    ? themeHex(`colour/${path}`, product)
    : primitiveHexByPath.get(`colour/${path}`) ?? '';
};

export type OldNameStatus = 'same' | 'cas' | 'approval';

export interface OldName {
  name: string;
  before: string;
  now: string;
  where?: string;
  status: OldNameStatus;
  question?: number;
}

// `before` is the production value before the CAS work; `now` is the CAS code
// name that replaced it (for its main use when a name had several)
export const oldNames: OldName[] = [
  { name: 'paper', before: '#FFFFFF', now: 'neutral[0]', status: 'same' },
  { name: 'fern', before: '#34A270', now: 'brand.crn[500]', status: 'same' },
  { name: 'pine', before: '#287953', now: 'brand.crn[800]', status: 'same' },
  { name: 'denim', before: '#006A92', now: 'brand.gp2[800]', status: 'same' },
  { name: 'info200', before: '#BFE3D3', now: 'brand.crn[100]', status: 'same' },
  {
    name: 'charcoal',
    before: '#00222C',
    now: 'foreground.primary',
    status: 'cas',
  },
  {
    name: 'neutral1000',
    before: '#00202C',
    now: 'foreground.primary',
    status: 'cas',
  },
  {
    name: 'pearl',
    before: '#FCFDFE',
    now: 'background.secondary',
    status: 'cas',
  },
  {
    name: 'neutral200',
    before: '#F6F9FB',
    now: 'background.secondary',
    status: 'cas',
  },
  {
    name: 'neutral300 (silver)',
    before: '#EDF1F3',
    now: 'background.tertiary',
    status: 'cas',
  },
  {
    name: 'neutral500 (steel)',
    before: '#DFE5EA',
    now: 'border.tertiary',
    where: 'borders',
    status: 'cas',
  },
  {
    name: 'neutral700 (tin)',
    before: '#C2C9CE',
    now: 'border.secondary',
    where: 'borders',
    status: 'cas',
  },
  {
    name: 'error100 (rose)',
    before: '#F7E8EA',
    now: 'background.error',
    status: 'cas',
  },
  {
    name: 'error500 (ember)',
    before: '#CD1426',
    now: 'foreground.error',
    status: 'cas',
  },
  {
    name: 'error900 (pepper)',
    before: '#B00A1A',
    now: 'utilitarian.red[700]',
    status: 'cas',
  },
  {
    name: 'warning100 (apricot)',
    before: '#F8EDDE',
    now: 'background.warning',
    status: 'cas',
  },
  {
    name: 'warning150',
    before: '#F2E1CB',
    now: 'background.warning',
    status: 'cas',
  },
  {
    name: 'warning500 (clay)',
    before: '#CE801A',
    now: 'foreground.warning',
    status: 'cas',
  },
  {
    name: 'warning900',
    before: '#B56B0B',
    now: 'utilitarian.orange[700]',
    status: 'cas',
  },
  {
    name: 'cerulean',
    before: '#008CC6',
    now: 'brand.gp2[500]',
    where: 'gradients, reminders',
    status: 'cas',
  },
  {
    name: 'neutral900 (lead)',
    before: '#4D646B',
    now: 'foreground.tertiary',
    where: 'grey text',
    status: 'approval',
    question: 1,
  },
  {
    name: 'neutral900 (lead)',
    before: '#4D646B',
    now: 'neutral[700]',
    where:
      'icon colours, gradients and shadows, where a CSS variable cannot be used',
    status: 'approval',
    question: 1,
  },
  {
    name: 'neutral700 (tin)',
    before: '#C2C9CE',
    now: 'foreground.tertiary',
    where: 'hint text in empty fields',
    status: 'approval',
    question: 1,
  },
  {
    name: 'neutral800',
    before: '#92999E',
    now: 'foreground.quaternary',
    where: 'light grey text',
    status: 'approval',
    question: 1,
  },
  {
    name: 'success100 (mint)',
    before: '#E4F5EE',
    now: 'background.success',
    where: 'success states',
    status: 'approval',
    question: 2,
  },
  {
    name: 'success500',
    before: '#34A270',
    now: 'foreground.success',
    status: 'approval',
    question: 2,
  },
  {
    name: 'success900',
    before: '#287953',
    now: 'foreground.success',
    status: 'approval',
    question: 2,
  },
  {
    name: 'info100, information100',
    before: '#E6F3F9',
    now: 'background.info',
    status: 'approval',
    question: 2,
  },
  {
    name: 'info150',
    before: '#C0DFED',
    now: 'border.info',
    status: 'approval',
    question: 2,
  },
  {
    name: 'info500, information500',
    before: '#0C8DC3',
    now: 'foreground.info',
    status: 'approval',
    question: 2,
  },
  {
    name: 'info900, information900',
    before: '#006A92',
    now: 'foreground.info',
    status: 'approval',
    question: 2,
  },
  {
    name: 'pine, clay, ember',
    before: '#287953',
    now: 'foreground.primary',
    where:
      'toast text; the status colour stays on the icon and border, as in the Figma Toast',
    status: 'cas',
  },
  {
    name: 'space',
    before: '#004561',
    now: 'foreground.secondary',
    where: 'tooltip background, as in the Figma Tooltip',
    status: 'approval',
    question: 3,
  },
  ...(
    [
      ['mint / pine', '#E4F5EE', 'green'],
      ['apricot / clay', '#F8EDDE', 'yellow'],
      ['info100 / denim', '#E6F3F9', 'blue'],
      ['azure / space', '#E7F7FE', 'blue'],
      ['lilac / berry', '#F8EAF7', 'lavender'],
      ['lavender / mauve', '#F2EDF5', 'lavender'],
    ] as const
  ).map(
    ([name, before, pair]): OldName => ({
      name,
      before,
      now: `background['color-${pair}']`,
      where: 'avatar initials; CAS has five pairs, we had six',
      status: 'approval',
      question: 3,
    }),
  ),
  {
    name: 'silver',
    before: '#EDF1F3',
    now: 'background.disabled',
    where: 'disabled buttons, fields and rows',
    status: 'approval',
    question: 5,
  },
  {
    name: 'lead',
    before: '#4D646B',
    now: 'foreground.disabled',
    where: 'disabled text',
    status: 'approval',
    question: 5,
  },
  {
    name: 'steel',
    before: '#DFE5EA',
    now: 'border.disabled',
    where: 'disabled checkbox and radio; disabled buttons have no border',
    status: 'approval',
    question: 5,
  },
  {
    name: 'fern',
    before: '#34A270',
    now: 'foreground.brand',
    where: 'links, tab underline, pagination arrows, brand text and icons',
    status: 'approval',
    question: 6,
  },
  {
    name: 'fern',
    before: '#34A270',
    now: 'background.button.primary.default',
    where: 'main button',
    status: 'approval',
    question: 6,
  },
  {
    name: 'pine',
    before: '#287953',
    now: 'background.button.primary.hover',
    where: 'main button on hover',
    status: 'cas',
  },
  {
    name: 'success100 (mint)',
    before: '#E4F5EE',
    now: "background['hover-brand']",
    where: 'hover in dropdowns, select lists, sort menus and tags',
    status: 'approval',
    question: 7,
  },
  {
    name: 'pine',
    before: '#287953',
    now: 'foreground.brand',
    where: 'hovered item text in dropdowns, select lists and sort menus',
    status: 'approval',
    question: 7,
  },
  {
    name: 'side menu selected (unnamed)',
    before: '#E7F7F0',
    now: 'background.active',
    where: 'selected side-menu item and selected page',
    status: 'approval',
    question: 7,
  },
  {
    name: 'fern',
    before: '#34A270',
    now: 'border.brand',
    where: 'focus border of fields and selects, checkbox and radio hover',
    status: 'approval',
    question: 8,
  },
  {
    name: 'fern',
    before: '#34A270',
    now: "background['brand-inverse']",
    where: 'radio checked, switch on (same in CRN, darker blue in GP2)',
    status: 'approval',
    question: 8,
  },
  {
    name: 'fern',
    before: '#34A270',
    now: "background['hover-brand-inverse']",
    where: 'checkbox checked, as in the Figma Checkbox',
    status: 'approval',
    question: 8,
  },
  {
    name: 'neutral200',
    before: '#F6F9FB',
    now: 'neutral[50]',
    where: 'table stripes (CAS has no role for them)',
    status: 'approval',
    question: 10,
  },
  {
    name: 'magenta',
    before: '#CF2FB3',
    now: 'magenta (kept, not in CAS)',
    where: 'gradients',
    status: 'approval',
    question: 3,
  },
  {
    name: 'iris',
    before: '#8C4E9F',
    now: 'iris (kept, not in CAS)',
    where: 'gradients',
    status: 'approval',
    question: 3,
  },
];
