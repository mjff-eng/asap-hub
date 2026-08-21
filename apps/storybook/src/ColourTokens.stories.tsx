import { CSSProperties, Fragment, ReactNode } from 'react';
import { colors } from '@asap-hub/react-components';
import { colors as gp2Colors } from '@asap-hub/gp2-components';

const { colour } = colors;

interface Swatch {
  hex?: string;
  rgba: string;
}

interface TokenRow {
  figmaName: string;
  swatch: Swatch;
}

const tokenGroups: { group: string; tokens: TokenRow[] }[] = [
  {
    group: 'colour / brand / crn',
    tokens: Object.entries(colour.brand.crn).map(([step, swatch]) => ({
      figmaName: step,
      swatch,
    })),
  },
  {
    group: 'colour / brand / gp2',
    tokens: Object.entries(colour.brand.gp2).map(([step, swatch]) => ({
      figmaName: step,
      swatch,
    })),
  },
  {
    group: 'colour / neutral',
    tokens: Object.entries(colour.neutral).map(([step, swatch]) => ({
      figmaName: step,
      swatch,
    })),
  },
];

const crnAliases = (swatch: Swatch): string[] =>
  Object.entries(colors)
    .filter(
      ([, value]) =>
        value !== colour &&
        typeof value === 'object' &&
        value !== null &&
        (value as Swatch).rgba === swatch.rgba,
    )
    .map(([name]) => name);

const gp2Aliases = (swatch: Swatch): string[] =>
  Object.entries(gp2Colors)
    .filter(([, value]) => (value as Swatch).rgba === swatch.rgba)
    .map(([name]) => name);

const legacyGroups: { group: string; names: string[] }[] = [
  {
    group: 'monochrome',
    names: ['pearl', 'silver', 'steel', 'tin', 'lead', 'charcoal'],
  },
  {
    group: 'accent',
    names: [
      'ember',
      'pepper',
      'rose',
      'sandstone',
      'clay',
      'apricot',
      'mint',
      'cerulean',
      'prussian',
      'space',
      'azure',
      'magenta',
      'berry',
      'lilac',
      'iris',
      'mauve',
      'lavender',
    ],
  },
  {
    group: 'semantic / error',
    names: ['error100', 'error500', 'error900'],
  },
  {
    group: 'semantic / neutral',
    names: [
      'neutral200',
      'neutral300',
      'neutral500',
      'neutral700',
      'neutral800',
      'neutral900',
      'neutral1000',
    ],
  },
  {
    group: 'semantic / success',
    names: ['success100'],
  },
  {
    group: 'semantic / warning',
    names: ['warning100', 'warning150', 'warning500', 'warning900'],
  },
];

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
  {
    value: '#008CC6 (cerulean)',
    closest: 'colour/brand/gp2/500 (#0C8DC3)',
    where: 'CRN palette',
  },
];

const pageStyle: CSSProperties = {
  fontFamily: 'Helvetica, Arial, sans-serif',
  color: '#1c1f21',
  maxWidth: '720px',
  padding: '24px',
};
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
const swatchFillStyle = (rgba: string): CSSProperties => ({
  position: 'absolute',
  inset: 0,
  background: rgba,
});
const nameStyle: CSSProperties = {
  fontFamily: 'monospace',
  fontSize: '13px',
  minWidth: '80px',
};
const hexStyle: CSSProperties = {
  fontFamily: 'monospace',
  fontSize: '13px',
  color: '#687883',
  minWidth: '90px',
};
const chipStyle = (ok: boolean): CSSProperties => ({
  fontSize: '11px',
  borderRadius: '10px',
  padding: '2px 8px',
  background: ok ? '#dcfae6' : '#fef0c7',
  color: ok ? '#067647' : '#b54708',
  whiteSpace: 'nowrap',
});
const aliasStyle: CSSProperties = {
  fontSize: '12px',
  color: '#687883',
  fontFamily: 'monospace',
};

const Row = ({
  swatch,
  name,
  chip,
  aliases,
}: {
  swatch: Swatch;
  name: string;
  chip: ReactNode;
  aliases: string[];
}) => (
  <div style={rowStyle}>
    <span style={swatchStyle}>
      <span style={swatchFillStyle(swatch.rgba)} />
    </span>
    <span style={nameStyle}>{name}</span>
    <span style={hexStyle}>{(swatch.hex ?? swatch.rgba).toUpperCase()}</span>
    {chip}
    {aliases.length > 0 && (
      <span style={aliasStyle}>aka {aliases.join(', ')}</span>
    )}
  </div>
);

export default {
  title: 'CAS Design System / Colours',
};

export const Colours = () => (
  <div style={pageStyle}>
    <h1 style={{ fontSize: '20px' }}>Colours</h1>
    <p style={{ fontSize: '14px', lineHeight: 1.5 }}>
      Colour variables from the CAS Design System Figma file (primitives →
      colour). A token is listed here only when its exact value is used in this
      codebase; use <code>colour.brand.crn[500]</code>-style names from{' '}
      <code>@asap-hub/react-components</code> for new code. Colours in the
      second half are in use but have no exact CAS token yet; they keep their
      historical names until design confirms their mapping.
    </p>
    {tokenGroups.map(({ group, tokens }) => (
      <Fragment key={group}>
        <h2 style={groupHeaderStyle}>{group}</h2>
        {tokens.map(({ figmaName, swatch }) => (
          <Row
            key={figmaName}
            swatch={swatch}
            name={figmaName}
            chip={<span style={chipStyle(true)}>matches Figma</span>}
            aliases={[
              ...crnAliases(swatch).map((name) => `${name} (CRN)`),
              ...gp2Aliases(swatch).map((name) => `${name} (GP2)`),
            ]}
          />
        ))}
      </Fragment>
    ))}
    <h1 style={{ fontSize: '20px', marginTop: '48px' }}>
      Project colours without a CAS token
    </h1>
    <p style={{ fontSize: '14px', lineHeight: 1.5 }}>
      These values exist in the codebase but have no exact match in the Figma
      variables export. They need a design decision: either adopt the closest
      CAS token (visual change) or add them to Figma.
    </p>
    {legacyGroups.map(({ group, names }) => (
      <Fragment key={group}>
        <h2 style={groupHeaderStyle}>{group}</h2>
        {names.map((name) => {
          const swatch = colors[
            name as keyof typeof colors
          ] as unknown as Swatch;
          return (
            <Row
              key={name}
              swatch={swatch}
              name={name}
              chip={<span style={chipStyle(false)}>no exact CAS match</span>}
              aliases={gp2Aliases(swatch).map((n) => `${n} (GP2)`)}
            />
          );
        })}
      </Fragment>
    ))}
    <h1 style={{ fontSize: '20px', marginTop: '48px' }}>
      Suspected drift (for design review)
    </h1>
    <p style={{ fontSize: '14px', lineHeight: 1.5 }}>
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
  </div>
);
