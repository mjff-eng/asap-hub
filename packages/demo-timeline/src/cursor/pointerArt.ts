// The pointer the viewer sees is drawn, not captured, so its shape is the
// creator's to pick. Every variant below is stated once, in its own unit box,
// and both the preview and the render draw it from here: two passes over the
// same outlines, a fattened halo underneath in the edge colour and the ink on
// top, which is how the click ring already stays readable on any page.

import { edgeFor, resolveCursorColor } from '../cursorColors';

export type PointerShape = {
  d: string;
  // set on an outline that encloses a hole, so the hole is not filled in
  evenOdd?: boolean;
};

export type PointerVariant = {
  id: string;
  label: string;
  shapes: PointerShape[];
  // the box the outlines are drawn in; every number above is in these units
  width: number;
  height: number;
  // the part of the shape that does the pointing, which is what lands on the
  // captured position. An arrow points from its tip, a hand from its fingertip
  // and a ring from its centre, so this is not the middle of the sprite.
  hotspot: { x: number; y: number };
  edgeWidth: number;
  // how tall the shape stands as a fraction of the frame, so it reads the same
  // at 1080p and at 4K
  heightRatio: number;
};

const arrow: PointerVariant = {
  id: 'arrow',
  label: 'Arrow',
  shapes: [{ d: 'M0,0 L0,750 L207,573 L343,895 L472,840 L343,530 L600,530 Z' }],
  width: 600,
  height: 895,
  hotspot: { x: 0, y: 0 },
  edgeWidth: 100,
  heightRatio: 0.055,
};

const hand: PointerVariant = {
  id: 'hand',
  label: 'Pointing hand',
  shapes: [
    {
      d: [
        'M230,0',
        'C189,0 156,33 156,74',
        'L156,455',
        'L128,428',
        'C99,400 53,401 25,430',
        'C5,459 6,505 26,533',
        'L196,700',
        'C247,750 316,778 388,778',
        'L432,778',
        'C509,778 570,717 570,640',
        'L570,430',
        'C570,395 542,367 507,367',
        'C497,367 488,369 479,373',
        'C474,341 447,317 414,317',
        'C403,317 393,319 384,323',
        'C378,292 350,269 318,269',
        'C314,269 309,269 305,270',
        'L305,74',
        'C305,33 271,0 230,0',
        'Z',
      ].join(' '),
    },
  ],
  width: 580,
  height: 780,
  hotspot: { x: 230, y: 0 },
  edgeWidth: 90,
  heightRatio: 0.07,
};

const ring: PointerVariant = {
  id: 'ring',
  label: 'Ring',
  shapes: [
    {
      d: [
        'M200,50 A150,150 0 1,0 200,350 A150,150 0 1,0 200,50 Z',
        'M200,105 A95,95 0 1,1 200,295 A95,95 0 1,1 200,105 Z',
      ].join(' '),
      evenOdd: true,
    },
  ],
  width: 400,
  height: 400,
  hotspot: { x: 200, y: 200 },
  edgeWidth: 60,
  heightRatio: 0.045,
};

export const pointerVariants = [arrow, hand, ring] as const;

export type PointerVariantId = (typeof pointerVariants)[number]['id'];

export const pointerVariantIds = pointerVariants.map(({ id }) => id) as [
  string,
  ...string[],
];

export const defaultPointerVariant = arrow.id;

// a layer saved before the picker existed carries no choice at all, and a
// document written by hand may carry one nobody drew
export const pointerVariant = (id?: string): PointerVariant =>
  pointerVariants.find((variant) => variant.id === id) ?? arrow;

// The halo straddles the outline, so half of it falls outside the shape and the
// box it is drawn in has to leave room for that much on every side.
export const pointerPad = (variant: PointerVariant): number =>
  variant.edgeWidth / 2;

export type PointerBox = {
  viewBox: string;
  width: number;
  height: number;
  // of the frame height, so the box can be sized without knowing the canvas
  heightRatio: number;
  aspectRatio: number;
  // where the pointing part sits inside the box, as a fraction of the box
  hotspotX: number;
  hotspotY: number;
};

export const pointerBox = (variant: PointerVariant): PointerBox => {
  const pad = pointerPad(variant);
  const width = variant.width + pad * 2;
  const height = variant.height + pad * 2;
  return {
    viewBox: `${-pad} ${-pad} ${width} ${height}`,
    width,
    height,
    heightRatio: (variant.heightRatio * height) / variant.height,
    aspectRatio: width / height,
    hotspotX: (variant.hotspot.x + pad) / width,
    hotspotY: (variant.hotspot.y + pad) / height,
  };
};

export type PointerLayer = {
  d: string;
  fillRule?: 'evenodd';
  fill: string;
  fillOpacity?: number;
  stroke?: string;
  strokeOpacity?: number;
  strokeWidth?: number;
};

// The two passes every variant is drawn in, in order: a fattened halo in the
// edge colour, then the ink over it. Stated here rather than in each renderer,
// so the preview and the export cannot come to draw it differently.
export const pointerLayers = (
  variant: PointerVariant,
  color?: string,
): PointerLayer[] => {
  const ink = resolveCursorColor(color);
  const edge = edgeFor(ink);
  const rule = (shape: PointerShape) =>
    shape.evenOdd ? ({ fillRule: 'evenodd' } as const) : {};

  return [
    ...variant.shapes.map((shape) => ({
      d: shape.d,
      ...rule(shape),
      fill: edge.color,
      fillOpacity: edge.opacity,
      stroke: edge.color,
      strokeOpacity: edge.opacity,
      strokeWidth: variant.edgeWidth,
    })),
    ...variant.shapes.map((shape) => ({
      d: shape.d,
      ...rule(shape),
      fill: ink,
    })),
  ];
};
