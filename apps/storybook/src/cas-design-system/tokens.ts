import { cssColour } from '@asap-hub/react-components';
import { casPrimitives, casTheme } from '@asap-hub/react-components/cas-tokens';

export { cssColour };

export type Product = keyof typeof casTheme;

export interface ThemeToken {
  figmaName: string;
  codeName: string;
  cssVariable: string;
  crn: ThemeValue;
  gp2: ThemeValue;
}

export interface ThemeValue {
  hex: string;
  alpha: number;
  alias?: string;
  production?: string;
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

const toLab = (hex: string): [number, number, number] => {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel > 0.04045
      ? ((channel + 0.055) / 1.055) ** 2.4
      : channel / 12.92;
  }) as [number, number, number];
  const f = (value: number) =>
    value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;
  const x = f((r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047);
  const y = f(r * 0.2126 + g * 0.7152 + b * 0.0722);
  const z = f((r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
};

// CIE76 colour difference: below 1 looks the same, 8 and above is clearly different
export const colourDistance = (a: string, b: string): number => {
  const [l1, a1, b1] = toLab(a);
  const [l2, a2, b2] = toLab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
};

// what a see-through colour looks like on a white page, to compare like for like
export const onWhite = (hex: string, alpha = 1): string =>
  `#${[1, 3, 5]
    .map((start) =>
      Math.round(
        255 - (255 - parseInt(hex.slice(start, start + 2), 16)) * alpha,
      )
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
    .toUpperCase()}`;

export type Distance = 'same' | 'close' | 'noticeable' | 'far';

export const distanceOf = (difference: number): Distance => {
  if (difference < 1) return 'same';
  if (difference < 3) return 'close';
  if (difference < 8) return 'noticeable';
  return 'far';
};

// the opaque CAS primitive nearest to a colour, to suggest a fix to design
export const closestPrimitive = (
  hex: string,
): { primitive: Primitive; difference: number } =>
  primitives
    .filter((primitive) => primitive.alpha === 1)
    .map((primitive) => ({
      primitive,
      difference: colourDistance(hex, primitive.hex),
    }))
    .reduce((best, candidate) =>
      candidate.difference < best.difference ? candidate : best,
    );

export interface ProductionGap {
  figmaName: string;
  product: Product;
  hex: string;
  alpha: number;
  alias?: string;
  production: string;
  difference: number;
  distance: Distance;
}

// every theme token with a known production colour, furthest first
export const productionGaps: ProductionGap[] = themeTokens
  .flatMap((token) =>
    (['crn', 'gp2'] as const).flatMap((product) => {
      const { hex, alpha, alias, production } = token[product];
      if (!production) return [];
      const difference = colourDistance(onWhite(hex, alpha), production);
      return [
        {
          figmaName: token.figmaName,
          product,
          hex,
          alpha,
          alias,
          production,
          difference,
          distance: distanceOf(difference),
        },
      ];
    }),
  )
  .sort((first, second) => second.difference - first.difference);

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
    : (primitiveHexByPath.get(`colour/${path}`) ?? '');
};

export interface OldName {
  name: string;
  before: string;
  now: string;
  where: string;
}

// `before` is the production value before the CAS work; `now` is the CAS code
// name used in its place
export const oldNames: OldName[] = [
  {
    name: 'paper',
    before: '#FFFFFF',
    now: 'background.primary',
    where: 'backgrounds',
  },
  {
    name: 'paper',
    before: '#FFFFFF',
    now: "foreground['primary-inverse']",
    where: 'text on dark',
  },
  {
    name: 'charcoal, neutral1000',
    before: '#00222C',
    now: 'foreground.primary',
    where: 'main text',
  },
  {
    name: 'lead, neutral900',
    before: '#4D646B',
    now: 'foreground.tertiary',
    where: 'grey text, disabled field and button text',
  },
  {
    name: 'lead, neutral900',
    before: '#4D646B',
    now: 'neutral[600]',
    where: 'icon colours, fades, checkbox and radio hover border',
  },
  {
    name: 'neutral800',
    before: '#92999E',
    now: 'foreground.quaternary',
    where: 'light grey text, empty date field',
  },
  {
    name: 'tin, neutral700',
    before: '#C2C9CE',
    now: 'foreground.disabled',
    where: 'hint text, placeholders, disabled icons',
  },
  {
    name: 'tin, neutral700',
    before: '#C2C9CE',
    now: 'border.secondary',
    where: 'borders',
  },
  {
    name: 'steel, neutral500',
    before: '#DFE5EA',
    now: 'border.tertiary',
    where: 'borders and dividers',
  },
  {
    name: 'steel',
    before: '#DFE5EA',
    now: 'border.disabled',
    where: 'disabled buttons, checkboxes and radios',
  },
  {
    name: 'silver, neutral300',
    before: '#EDF1F3',
    now: 'background.tertiary',
    where: 'grey panels',
  },
  {
    name: 'silver',
    before: '#EDF1F3',
    now: 'background.disabled',
    where: 'disabled buttons, fields and tags',
  },
  {
    name: 'pearl',
    before: '#FCFDFE',
    now: 'background.secondary',
    where: 'light panels',
  },
  {
    name: 'neutral200',
    before: '#F6F9FB',
    now: 'neutral[50]',
    where: 'table stripes',
  },
  {
    name: 'fern, primary500',
    before: '#34A270',
    now: 'foreground.brand',
    where: 'links, tabs, pagination, brand text and icons',
  },
  {
    name: 'fern, primary500',
    before: '#34A270',
    now: 'background.button.primary.default',
    where: 'main button',
  },
  {
    name: 'pine, primary900',
    before: '#287953',
    now: 'background.button.primary.hover',
    where: 'main button on hover',
  },
  {
    name: 'fern, primary500',
    before: '#34A270',
    now: 'border.brand',
    where: 'focus borders',
  },
  {
    name: 'fern, primary500',
    before: '#34A270',
    now: "background['brand-inverse']",
    where: 'checkbox and radio checked, switch on',
  },
  {
    name: 'pine, primary900',
    before: '#287953',
    now: "background['hover-brand-inverse']",
    where: 'checkbox and radio checked, on hover',
  },
  {
    name: 'pine, primary900',
    before: '#287953',
    now: 'foreground.brand',
    where: 'hovered menu text, selected side menu text',
  },
  {
    name: 'mint, primary100',
    before: '#E4F5EE',
    now: "background['hover-brand']",
    where: 'hover in dropdowns, selects and tags',
  },
  {
    name: 'side menu selected',
    before: '#E7F7F0',
    now: 'background.active',
    where: 'selected side-menu item and page',
  },
  {
    name: 'success100 (mint)',
    before: '#E4F5EE',
    now: 'background.success',
    where: 'success states',
  },
  {
    name: 'success500',
    before: '#34A270',
    now: 'foreground.success',
    where: 'success text and icons',
  },
  {
    name: 'success900',
    before: '#287953',
    now: 'border.success',
    where: 'success borders',
  },
  {
    name: 'info100',
    before: '#E6F3F9',
    now: 'background.info',
    where: 'info states',
  },
  {
    name: 'info500',
    before: '#0C8DC3',
    now: 'foreground.info',
    where: 'info text and icons',
  },
  {
    name: 'info500',
    before: '#0C8DC3',
    now: 'border.info',
    where: 'info borders',
  },
  {
    name: 'warning100 (apricot)',
    before: '#F8EDDE',
    now: 'background.warning',
    where: 'warning states',
  },
  {
    name: 'warning500 (clay)',
    before: '#CE801A',
    now: 'foreground.warning',
    where: 'warning text and icons',
  },
  {
    name: 'warning900',
    before: '#B56B0B',
    now: 'foreground.warning',
    where: 'darker warning text, icons and borders',
  },
  {
    name: 'error100 (rose)',
    before: '#F7E8EA',
    now: 'background.error',
    where: 'error states',
  },
  {
    name: 'error500 (ember)',
    before: '#CD1426',
    now: 'foreground.error',
    where: 'error text',
  },
  {
    name: 'error900 (pepper)',
    before: '#B00A1A',
    now: 'utilitarian.red[700]',
    where: 'warning button border and hover',
  },
  {
    name: 'space',
    before: '#004561',
    now: 'brand.gp2[900]',
    where: 'tooltip background',
  },
  {
    name: 'cerulean',
    before: '#008CC6',
    now: 'brand.gp2[500]',
    where: 'gradients, reminders',
  },
  {
    name: 'info200',
    before: '#BFE3D3',
    now: 'brand.crn[100]',
    where: 'light brand borders',
  },
  {
    name: 'magenta',
    before: '#CF2FB3',
    now: 'magenta (kept, not in CAS)',
    where: 'gradients',
  },
  {
    name: 'iris',
    before: '#8C4E9F',
    now: 'iris (kept, not in CAS)',
    where: 'gradients',
  },
];
