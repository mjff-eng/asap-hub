export interface OpaqueColor {
  r: number;
  g: number;
  b: number;
  rgb: string;
  rgba: string;
  hex: string;
}
export interface TransparentColor {
  r: number;
  g: number;
  b: number;
  a: number;
  rgba: string;
}

export function color(r: number, g: number, b: number): OpaqueColor;
export function color(
  r: number,
  g: number,
  b: number,
  a: number,
): TransparentColor;
export function color(
  r: number,
  g: number,
  b: number,
  a?: number,
): OpaqueColor | TransparentColor {
  return typeof a === 'number'
    ? {
        r,
        g,
        b,
        a,
        rgba: `rgba(${r}, ${g}, ${b}, ${a})`,
      }
    : {
        r,
        g,
        b,
        rgb: `rgb(${r}, ${g}, ${b})`,
        rgba: `rgba(${r}, ${g}, ${b}, 1)`,
        hex:
          // eslint-disable-next-line prefer-template
          '#' +
          r.toString(16).padStart(2, '0') +
          g.toString(16).padStart(2, '0') +
          b.toString(16).padStart(2, '0'),
      };
}

export const colorWithTransparency = (
  opaqueColor: OpaqueColor,
  a: number,
): TransparentColor => color(opaqueColor.r, opaqueColor.g, opaqueColor.b, a);

// CAS Design System primitives (Figma: CAS Design System → primitives → colour)
// Only tokens whose exact values are used in this project are listed.
export const colour = {
  brand: {
    crn: {
      100: color(191, 227, 211),
      500: color(52, 162, 112),
      800: color(40, 121, 83),
    },
    gp2: {
      25: color(230, 243, 249),
      100: color(192, 223, 237),
      500: color(12, 141, 195),
      800: color(0, 106, 146),
    },
  },
  neutral: {
    0: color(255, 255, 255),
  },
} as const;

// Monochrome
export const pearl = color(252, 253, 254);
export const charcoal = color(0, 34, 44);

// Accent

export const cerulean = color(0, 140, 198);

export const space = color(0, 69, 97);
export const azure = color(231, 247, 254);

export const magenta = color(207, 47, 179);
export const berry = color(154, 35, 134);
export const lilac = color(248, 234, 247);

export const iris = color(140, 78, 159);
export const mauve = color(105, 59, 119);
export const lavender = color(242, 237, 245);

export const error100 = color(247, 232, 234);
export const error500 = color(205, 20, 38);
export const error900 = color(176, 10, 26);

export const info100 = colour.brand.gp2[25];
export const info150 = colour.brand.gp2[100];
export const info200 = colour.brand.crn[100];
export const info500 = colour.brand.gp2[500];
export const info900 = colour.brand.gp2[800];

export const information100 = colour.brand.gp2[25];
export const information500 = colour.brand.gp2[500];
export const information900 = colour.brand.gp2[800];

export const neutral200 = color(246, 249, 251);
export const neutral300 = color(237, 241, 243);
export const neutral500 = color(223, 229, 234);
export const neutral700 = color(194, 201, 206);
export const neutral800 = color(146, 153, 158);
export const neutral900 = color(77, 100, 107);
export const neutral1000 = color(0, 32, 44);

export const success100 = color(228, 245, 238);
export const success500 = colour.brand.crn[500];
export const success900 = colour.brand.crn[800];

export const warning100 = color(248, 237, 222);
export const warning150 = color(242, 225, 203);
export const warning500 = color(206, 128, 26);
export const warning900 = color(181, 107, 11);
