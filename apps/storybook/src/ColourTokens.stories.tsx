import { CSSProperties, Fragment, ReactNode } from 'react';
import { colors } from '@asap-hub/react-components';
import { colors as gp2Colors } from '@asap-hub/gp2-components';
import valueTokens from './cas-tokens/Value.tokens.json';
import lightTokens from './cas-tokens/Light.tokens.json';
import crnTheme from './cas-tokens/CRN.tokens.json';
import gp2Theme from './cas-tokens/GP2.tokens.json';
import {
  TokenEntry,
  groupInOrder,
  parseColourTokens,
} from './cas-tokens/parse';

const primitives = parseColourTokens(valueTokens);
const light = parseColourTokens(lightTokens);
const crn = parseColourTokens(crnTheme);
const gp2 = parseColourTokens(gp2Theme);

const primitiveByPath = new Map(
  primitives.map((entry) => [entry.path.join('/'), entry]),
);

// which primitive values are used in code, and under which names
const rgbToHex = (c: { r: number; g: number; b: number }): string =>
  `#${[c.r, c.g, c.b]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;

// keyed by hex plus alpha so a transparent code colour only matches a CAS
// alpha token with the same base value AND the same opacity; .rgb and .rgba
// of an opaque palette colour are the same colour (alpha 1)
const codeNamesByValue = new Map<string, string[]>();
const valueKey = (hex: string, alpha: number): string => `${hex}@${alpha}`;
const registerPalette = (
  palette: Record<string, unknown>,
  suffix: string,
  exclude: string[] = [],
) =>
  Object.entries(palette).forEach(([name, value]) => {
    if (exclude.includes(name)) return;
    const c = value as { r?: number; g?: number; b?: number; a?: number };
    if (typeof c?.r !== 'number') return;
    const key = valueKey(
      rgbToHex(c as { r: number; g: number; b: number }),
      c.a ?? 1,
    );
    codeNamesByValue.set(key, [
      ...(codeNamesByValue.get(key) ?? []),
      `${name} ${suffix}`,
    ]);
  });
registerPalette(colors as unknown as Record<string, unknown>, '(CRN)', [
  'colour',
]);
registerPalette(gp2Colors as unknown as Record<string, unknown>, '(GP2)');

const usedInCode = (entry: TokenEntry): string[] =>
  codeNamesByValue.get(valueKey(entry.hex, entry.alpha)) ?? [];

// legacy palette colours whose values were not originally in CAS:
// oldHex is the pre-migration production value; candidate is the CAS token
// that replaced it (migrated) or the nearest one for context (kept as-is)
interface LegacyEntry {
  name: string;
  oldHex: string;
  candidate: string;
}
const legacyGroups: { group: string; entries: LegacyEntry[] }[] = [
  {
    group: 'monochrome',
    entries: [
      { name: 'pearl', oldHex: '#FCFDFE', candidate: 'colour/neutral/25' },
      { name: 'charcoal', oldHex: '#00222C', candidate: 'colour/neutral/900' },
    ],
  },
  {
    group: 'accent',
    entries: [
      {
        name: 'cerulean',
        oldHex: '#008CC6',
        candidate: 'colour/brand/gp2/500',
      },
      { name: 'space', oldHex: '#004561', candidate: 'colour/brand/gp2/900' },
      { name: 'azure', oldHex: '#E7F7FE', candidate: 'colour/brand/gp2/25' },
      {
        name: 'magenta',
        oldHex: '#CF2FB3',
        candidate: 'colour/general/purple/iris/500',
      },
      {
        name: 'berry',
        oldHex: '#9A2386',
        candidate: 'colour/general/purple/iris/800',
      },
      {
        name: 'lilac',
        oldHex: '#F8EAF7',
        candidate: 'colour/general/purple/lavender/25',
      },
      {
        name: 'iris',
        oldHex: '#8C4E9F',
        candidate: 'colour/general/purple/iris/600',
      },
      {
        name: 'mauve',
        oldHex: '#693B77',
        candidate: 'colour/general/purple/iris/800',
      },
      {
        name: 'lavender',
        oldHex: '#F2EDF5',
        candidate: 'colour/general/purple/iris/25',
      },
    ],
  },
  {
    group: 'semantic / error',
    entries: [
      {
        name: 'error100',
        oldHex: '#F7E8EA',
        candidate: 'colour/utilitarian/red/100',
      },
      {
        name: 'error500',
        oldHex: '#CD1426',
        candidate: 'colour/utilitarian/red/600',
      },
      {
        name: 'error900',
        oldHex: '#B00A1A',
        candidate: 'colour/utilitarian/red/700',
      },
    ],
  },
  {
    group: 'semantic / neutral',
    entries: [
      { name: 'neutral200', oldHex: '#F6F9FB', candidate: 'colour/neutral/50' },
      {
        name: 'neutral300',
        oldHex: '#EDF1F3',
        candidate: 'colour/general/blue/cerulean/25',
      },
      {
        name: 'neutral500',
        oldHex: '#DFE5EA',
        candidate: 'colour/neutral/100',
      },
      {
        name: 'neutral700',
        oldHex: '#C2C9CE',
        candidate: 'colour/neutral/200',
      },
      {
        name: 'neutral800',
        oldHex: '#92999E',
        candidate: 'colour/neutral/400',
      },
      {
        name: 'neutral900',
        oldHex: '#4D646B',
        candidate: 'colour/neutral/600',
      },
      {
        name: 'neutral1000',
        oldHex: '#00202C',
        candidate: 'colour/neutral/900',
      },
    ],
  },
  {
    group: 'semantic / success',
    entries: [
      {
        name: 'success100',
        oldHex: '#E4F5EE',
        candidate: 'colour/brand/crn/25',
      },
    ],
  },
  {
    group: 'semantic / warning',
    entries: [
      {
        name: 'warning100',
        oldHex: '#F8EDDE',
        candidate: 'colour/utilitarian/orange/50',
      },
      {
        name: 'warning150',
        oldHex: '#F2E1CB',
        candidate: 'colour/utilitarian/orange/100',
      },
      {
        name: 'warning500',
        oldHex: '#CE801A',
        candidate: 'colour/utilitarian/orange/600',
      },
      {
        name: 'warning900',
        oldHex: '#B56B0B',
        candidate: 'colour/utilitarian/orange/700',
      },
    ],
  },
];

const channel = (hex: string, i: number) =>
  parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);

const nearMisses = [
  {
    value: '#0C8DC4',
    closest: 'colour/brand/gp2/500 (#0C8DC3)',
    where: 'gp2 logo and calendar icons',
  },
  {
    value: '#35A170',
    closest: 'colour/brand/crn/500 (#34A270)',
    where: 'gp2 logo and calendar icons',
  },
];

const pageStyle: CSSProperties = {
  fontFamily: 'Helvetica, Arial, sans-serif',
  color: '#1c1f21',
  maxWidth: '860px',
  padding: '24px',
};
const introStyle: CSSProperties = { fontSize: '14px', lineHeight: 1.5 };
const groupHeaderStyle: CSSProperties = {
  fontSize: '13px',
  color: '#687883',
  margin: '32px 0 8px',
  fontWeight: 'normal',
};
const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '8px 12px',
  borderBottom: '1px solid #eef1f3',
};
const swatchStyle: CSSProperties = {
  width: '28px',
  height: '28px',
  borderRadius: '4px',
  background:
    'repeating-conic-gradient(#e3e6e8 0% 25%, #ffffff 0% 50%) 0 0 / 12px 12px',
  position: 'relative',
  flexShrink: 0,
  border: '1px solid #e3e6e8',
  overflow: 'hidden',
};
const swatchFillStyle = (background: string): CSSProperties => ({
  position: 'absolute',
  inset: 0,
  background,
});
const nameStyle: CSSProperties = {
  fontFamily: 'monospace',
  fontSize: '13px',
  minWidth: '90px',
};
const hexStyle: CSSProperties = {
  fontFamily: 'monospace',
  fontSize: '13px',
  color: '#687883',
  minWidth: '100px',
};
const chipColors = {
  green: { background: '#dcfae6', color: '#067647' },
  amber: { background: '#fef0c7', color: '#b54708' },
  red: { background: '#fee4e2', color: '#b42318' },
  grey: { background: '#f0f1f2', color: '#687883' },
};
const chipStyle = (kind: keyof typeof chipColors): CSSProperties => ({
  fontSize: '11px',
  borderRadius: '10px',
  padding: '2px 8px',
  whiteSpace: 'nowrap',
  ...chipColors[kind],
});
const aliasStyle: CSSProperties = {
  fontSize: '12px',
  color: '#687883',
  fontFamily: 'monospace',
};
const aliasChipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '12px',
  fontFamily: 'monospace',
  border: '1px solid #e3e6e8',
  borderRadius: '4px',
  padding: '2px 6px',
};
const columnsRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '160px 1fr 1fr',
  alignItems: 'center',
  gap: '12px',
  padding: '8px 12px',
  borderBottom: '1px solid #eef1f3',
};
const columnHeaderStyle: CSSProperties = {
  ...columnsRowStyle,
  fontSize: '12px',
  fontWeight: 'bold',
  color: '#687883',
  borderBottom: '2px solid #e3e6e8',
};

const rgbaCss = (hex: string, alpha: number): string =>
  alpha === 1
    ? hex
    : `rgba(${channel(hex, 0)}, ${channel(hex, 1)}, ${channel(
        hex,
        2,
      )}, ${alpha})`;

const Swatch = ({ hex, alpha = 1 }: { hex: string; alpha?: number }) => (
  <span style={swatchStyle}>
    <span style={swatchFillStyle(rgbaCss(hex, alpha))} />
  </span>
);

const HexLabel = ({ hex, alpha = 1 }: { hex: string; alpha?: number }) => (
  <span style={hexStyle}>
    {hex}
    {alpha !== 1 && ` ${Math.round(alpha * 100)}%`}
  </span>
);

const AliasChip = ({ entry }: { entry: TokenEntry }) => (
  <span style={aliasChipStyle}>
    <span style={{ ...swatchStyle, width: '14px', height: '14px' }}>
      <span style={swatchFillStyle(rgbaCss(entry.hex, entry.alpha))} />
    </span>
    {entry.alias ?? entry.hex}
  </span>
);

const Page = ({
  title,
  intro,
  children,
}: {
  title: string;
  intro: ReactNode;
  children: ReactNode;
}) => (
  <div style={pageStyle}>
    <h1 style={{ fontSize: '20px' }}>{title}</h1>
    <p style={introStyle}>{intro}</p>
    {children}
  </div>
);

export default {
  title: 'CAS Design System / Colours',
};

export const Primitives = () => (
  <Page
    title="Primitives"
    intro={
      <>
        Every colour variable in the CAS Design System Figma file (collection
        primitives → colour), in Figma order. Rows with a green chip are values
        this codebase uses today, with the variable names they are available
        under; use <code>colour.brand.crn[500]</code>-style tokens from{' '}
        <code>@asap-hub/react-components</code> for those. Unmarked rows exist
        in Figma but are not used in code yet. By convention, icon and image
        SVGs keep their colour values inline; the named variables are for all
        other styling code.
      </>
    }
  >
    {groupInOrder(primitives).map(({ group, tokens }) => (
      <Fragment key={group}>
        <h2 style={groupHeaderStyle}>{group}</h2>
        {tokens.map((token) => {
          const names = usedInCode(token);
          return (
            <div style={rowStyle} key={token.name}>
              <Swatch hex={token.hex} alpha={token.alpha} />
              <span style={nameStyle}>{token.name}</span>
              <HexLabel hex={token.hex} alpha={token.alpha} />
              {names.length > 0 && (
                <>
                  <span style={chipStyle('green')}>used in code</span>
                  <span style={aliasStyle}>as {names.join(', ')}</span>
                </>
              )}
            </div>
          );
        })}
      </Fragment>
    ))}
  </Page>
);

export const Modes = () => (
  <Page
    title="Modes (Light)"
    intro={
      <>
        The mode collection remaps every ramp step to a primitive per mode. The
        products only implement Light; the Figma file also defines a Dark mode,
        deliberately out of scope here.
      </>
    }
  >
    {groupInOrder(light).map(({ group, tokens }) => (
      <Fragment key={group}>
        <h2 style={groupHeaderStyle}>{group}</h2>
        <div style={columnHeaderStyle}>
          <span>Name</span>
          <span>Light</span>
          <span />
        </div>
        {tokens.map((token) => (
          <div style={columnsRowStyle} key={token.name}>
            <span style={nameStyle}>{token.name}</span>
            <AliasChip entry={token} />
            <span />
          </div>
        ))}
      </Fragment>
    ))}
  </Page>
);

export const Themes = () => {
  const gp2ByPath = new Map(gp2.map((e) => [e.path.join('/'), e]));
  return (
    <Page
      title="Themes (CRN and GP2)"
      intro={
        <>
          The theme collection is the semantic layer designers use in Figma:
          names like colour/foreground/primary resolve to a mode variable, which
          resolves to a primitive. This is the vocabulary to converge on for
          component code once the palette migration is agreed. The Figma file
          also has an ARIA theme, not exported here because this repo does not
          build ARIA.
        </>
      }
    >
      {groupInOrder(crn).map(({ group, tokens }) => (
        <Fragment key={group}>
          <h2 style={groupHeaderStyle}>{group}</h2>
          <div style={columnHeaderStyle}>
            <span>Name</span>
            <span>CRN</span>
            <span>GP2</span>
          </div>
          {tokens.map((token) => {
            const gp2Token = gp2ByPath.get(token.path.join('/'));
            return (
              <div style={columnsRowStyle} key={token.name}>
                <span style={nameStyle}>{token.name}</span>
                <AliasChip entry={token} />
                {gp2Token ? <AliasChip entry={gp2Token} /> : <span />}
              </div>
            );
          })}
        </Fragment>
      ))}
    </Page>
  );
};

export const CodeStatus = () => (
  <Page
    title="Code status: our palette vs CAS"
    intro={
      <>
        Every colour in the production palette falls into one of three states.
        <b> In sync</b> (green): the value has always matched CAS, and styling
        code references it through the CAS token (icon and image SVGs are exempt
        and keep their values inline). <b>Migrated to CAS</b> (green, with old
        value struck through): CAS redesigned this colour and the codebase now
        uses the new CAS value; the row shows the old production value next to
        its replacement so the visual shift is reviewable. <b>Not in CAS</b>{' '}
        (red): no CAS colour is close to this value. Agreed with design: these
        keep their current name and value in code, and no Figma colour is used
        in their place; the nearest CAS colour is shown only for context.
        Matching is alpha-aware: a CAS alpha token (900-A4 to 900-A40) only
        counts as used when code has the same base colour at the same opacity,
        and the .rgb and .rgba forms of a palette colour are the same value.
      </>
    }
  >
    <h2 style={{ fontSize: '16px', marginTop: '32px' }}>In sync</h2>
    {groupInOrder(
      primitives.filter((token) => usedInCode(token).length > 0),
    ).map(({ group, tokens }) => (
      <Fragment key={group}>
        <h2 style={groupHeaderStyle}>{group}</h2>
        {tokens.map((token) => (
          <div style={rowStyle} key={token.name}>
            <Swatch hex={token.hex} alpha={token.alpha} />
            <span style={nameStyle}>{token.name}</span>
            <HexLabel hex={token.hex} alpha={token.alpha} />
            <span style={chipStyle('green')}>matches Figma</span>
            <span style={aliasStyle}>aka {usedInCode(token).join(', ')}</span>
          </div>
        ))}
      </Fragment>
    ))}
    <h2 style={{ fontSize: '16px', marginTop: '32px' }}>
      Migrated or kept as-is
    </h2>
    {legacyGroups.map(({ group, entries }) => (
      <Fragment key={group}>
        <h2 style={groupHeaderStyle}>{group}</h2>
        {entries.map(({ name, oldHex, candidate }) => {
          const ours = colors[name as keyof typeof colors] as unknown as {
            r: number;
            g: number;
            b: number;
          };
          const hex = rgbToHex(ours);
          const candidateToken = primitiveByPath.get(candidate);
          const migrated = candidateToken?.hex === hex;
          return (
            <div style={rowStyle} key={name}>
              <span style={nameStyle}>{name}</span>
              {migrated && candidateToken ? (
                <>
                  <Swatch hex={oldHex} />
                  <span style={{ ...hexStyle, textDecoration: 'line-through' }}>
                    {oldHex}
                  </span>
                  <span style={aliasStyle}>→</span>
                  <Swatch hex={candidateToken.hex} />
                  <HexLabel hex={candidateToken.hex} />
                  <span style={chipStyle('green')}>migrated to CAS</span>
                  <span style={aliasStyle}>{candidate}</span>
                </>
              ) : (
                <>
                  <Swatch hex={hex} />
                  <HexLabel hex={hex} />
                  <span style={chipStyle('red')}>not in CAS, kept as-is</span>
                  {candidateToken && (
                    <>
                      <span style={aliasStyle}>nearest is</span>
                      <Swatch hex={candidateToken.hex} />
                      <span style={aliasStyle}>
                        {candidate} {candidateToken.hex}
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          );
        })}
      </Fragment>
    ))}
    <h2 style={{ fontSize: '16px', marginTop: '32px' }}>
      Suspected drift (for design review)
    </h2>
    <p style={introStyle}>
      Values found in the codebase that are one digit away from a CAS token,
      probably unintended copies:
    </p>
    <ul style={{ fontSize: '13px', lineHeight: 1.8, fontFamily: 'monospace' }}>
      {nearMisses.map(({ value, closest, where }) => (
        <li key={value}>
          {value} ≈ {closest} (found in {where})
        </li>
      ))}
    </ul>
  </Page>
);
