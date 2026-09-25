import { CSSProperties, useState } from 'react';
import { colour } from '@asap-hub/react-components';
import {
  casHex,
  cssColour,
  figmaChanges,
  oldNames,
  Primitive,
  primitiveRamps,
  Product,
  ThemeToken,
  themeHex,
  themeTokens,
  themeTokensByPrimitive,
} from './tokens';
import {
  Chip,
  Colour,
  ContrastBadge,
  Copy,
  mono,
  muted,
  Page,
  Rich,
  Section,
  Swatch,
  useCopy,
} from './ui';

export default {
  title: 'CAS Design System / Colours',
};

const code = (text: string) => <code style={mono}>{text}</code>;
const codeColour = (name: string) => (
  <Colour value={casHex(name)} label={`colour.${name}`} />
);

const table: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};
const cell: CSSProperties = {
  padding: '8px',
  borderBottom: `1px solid ${colour.border.tertiary}`,
  verticalAlign: 'middle',
  textAlign: 'left',
};
const headCell: CSSProperties = {
  ...cell,
  ...muted,
  fontWeight: 500,
  borderBottom: `1px solid ${colour.border.secondary}`,
};
export const StartHere = () => (
  <Page
    title="Colours: start here"
    intro="Colours in CRN and GP2 come from the CAS Design System in Figma. The code is generated from the Figma variables, so the name a designer picks in Figma is the name an engineer types."
  >
    <Section title="One name everywhere">
      <table style={table}>
        <thead>
          <tr>
            <th style={headCell}>Before: name in code</th>
            <th style={headCell}>Figma variable</th>
            <th style={headCell}>Now: name in code</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['colour/foreground/primary', 'charcoal, neutral1000', '#00222C'],
            ['colour/border/tertiary', 'steel, neutral500', '#DFE5EA'],
            ['colour/foreground/primary-inverse', 'paper', '#FFFFFF'],
            [
              'colour/background/button/primary/default',
              'fern (CRN), primary500 (GP2)',
              '#34A270',
            ],
          ].map(([name, before, beforeHex]) => {
            const token = themeTokens.find((t) => t.figmaName === name);
            return (
              token && (
                <tr key={name}>
                  <td style={{ ...cell, ...muted }}>
                    <Colour
                      value={beforeHex as string}
                      label={`${before} ${beforeHex}`}
                    />
                  </td>
                  <td style={cell}>
                    <Colour
                      value={token.crn.hex}
                      label={`${token.figmaName} ${token.crn.hex}`}
                    />
                  </td>
                  <td style={cell}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Swatch background={token.crn.hex} size={12} />
                      <Copy text={token.codeName} />
                    </span>
                  </td>
                </tr>
              )
            );
          })}
        </tbody>
      </table>
      <p>
        Before, the code used its own names, sometimes two for the same colour,
        and none of them appeared in Figma. Now the name in code is the Figma
        name: swap each {code('/')} for {code('.')}. Parts with a hyphen go in
        brackets, for example {codeColour("foreground['primary-inverse']")}.
      </p>
    </Section>
    <Section title="Which colour to use">
      <p style={{ marginTop: 0 }}>
        Type the name the design shows. A frame that uses{' '}
        <Colour
          value={casHex('border.secondary')}
          label="colour/border/secondary"
        />{' '}
        becomes {codeColour('border.secondary')}. If design later points that
        token at another colour, re-exporting from Figma updates every screen
        with no code change.
      </p>
      <ol style={{ paddingLeft: '20px' }}>
        <li>
          <b>Theme tokens first</b> ({code('colour.foreground.*')},{' '}
          {code('colour.background.*')}, {code('colour.border.*')}). Use them
          for anything with a meaning: text, links, backgrounds, borders, hover,
          selected, disabled, status. Each has a CRN and a GP2 value, so shared
          components show the right product colour. See <i>Theme Tokens</i>.
        </li>
        <li>
          <b>Transparency</b>:{' '}
          <Colour
            value={cssColour(casHex('border.secondary'), 0.7)}
            label="colourWithAlpha(colour.border.secondary, 0.7)"
          />
          . It works with tokens and primitives and still follows the token
          value.
        </li>
        <li>
          <b>Primitives</b> ({codeColour('neutral[700]')}) only when a token
          cannot work or does not exist:
          <ul style={{ paddingLeft: '20px' }}>
            <li>
              emails and SVG attributes such as {code('fill={...}')}, which
              cannot read CSS variables;
            </li>
            <li>
              shadows, gradients, table stripes and artwork, which have no token
              yet;
            </li>
            <li>colours that must stay the same in both products.</li>
          </ul>
          If a colour has a meaning but no token fits, use the nearest primitive
          and add it to <i>Design Questions</i> so CAS can add a token. See{' '}
          <i>Primitives</i>.
        </li>
        <li>
          <b>Never a hard-coded value.</b> Lint rejects hex, {code('rgb()')} and{' '}
          {code('hsl()')} values outside icons, images and tests.{' '}
          {code('yarn colours:report')} shows how code uses colour.
        </li>
        <li>
          <b>The old names are gone</b> (
          <Colour value="#DFE5EA" label="neutral500" />,{' '}
          <Colour value="#00222C" label="charcoal" />,{' '}
          <Colour value="#E4F5EE" label="success100" />
          …). <i>Legacy Names</i> records what replaced each one, for anyone
          reading older code.
        </li>
      </ol>
    </Section>
    <Section title="Good to know">
      <ul style={{ paddingLeft: '20px' }}>
        <li>
          Theme tokens are CSS variables set by {code('<GlobalStyles />')}. GP2
          apps render {code('<GlobalStyles product="gp2" />')}, and anything
          inside the GP2 {code('<Theme>')} also gets the GP2 values.
        </li>
        <li>
          Email templates cannot use CSS variables, because email clients do not
          support them. Use primitives there. The email layouts give links the
          product brand colour as a fixed value, and a test fails if an email
          renders a CSS variable.
        </li>
        <li>
          In Storybook, the <b>Product</b> menu in the toolbar switches every
          story between the CRN and GP2 colours. GP2 stories use GP2 by default.
        </li>
        <li>
          Some colours still wait on design decisions. See{' '}
          <i>Design Questions</i>.
        </li>
        <li>
          Typography, spacing and radius variables also exist in Figma. They are
          the next step and are not in code yet.
        </li>
      </ul>
    </Section>
    <Section title="Updating from Figma">
      <ol style={{ paddingLeft: '20px' }}>
        <li>
          In Figma, open the CAS Design System variables. Right-click each
          collection and export its modes: <b>primitives</b> (Value),{' '}
          <b>mode</b> (Light) and <b>theme</b> (CRN and GP2). ASAP ignores Dark
          and ARIA.
        </li>
        <li>
          Replace the files in {code('packages/react-components/cas-tokens')}.
        </li>
        <li>
          Run {code('yarn cas-tokens:generate')} and commit the result. Never
          edit {code('cas-tokens.generated.ts')} by hand.
        </li>
        <li>
          If it stops with &quot;Figma now sets ... remove it from
          asap-overrides.json&quot;, design has fixed that name: delete the
          entry from {code('cas-tokens/asap-overrides.json')} and run it again.
        </li>
      </ol>
      <p style={muted}>
        {code('asap-overrides.json')} keeps the Hub looking like production
        while Figma still holds different values for some names. It only points
        a name at another CAS primitive, never at a typed colour, and each entry
        is listed in <i>Design Questions</i> as a change we ask of the CAS file.
      </p>
    </Section>
  </Page>
);

const groupOf = (figmaName: string) => figmaName.split('/')[1] as string;

export const ThemeTokens = () => {
  const [query, setQuery] = useState('');
  const [onlyDifferent, setOnlyDifferent] = useState(false);
  const visible = themeTokens.filter(
    (token) =>
      token.figmaName.includes(query.trim().toLowerCase()) &&
      (!onlyDifferent || token.crn.hex !== token.gp2.hex),
  );
  const white = themeHex('colour/background/primary');
  const dark = themeHex('colour/foreground/primary');
  const contrastProducts = (token: ThemeToken): Product[] =>
    token.gp2.hex === token.crn.hex &&
    !token.figmaName.includes('button/primary')
      ? ['crn']
      : ['crn', 'gp2'];
  const contrastBackground = (figmaName: string, product: Product) => {
    if (figmaName.includes('button/primary')) {
      return {
        hex: themeHex('colour/background/button/primary/default', product),
        label: 'on background/button/primary/default',
      };
    }
    return figmaName.includes('inverse')
      ? { hex: dark, label: 'on foreground/primary' }
      : { hex: white, label: 'on white' };
  };
  return (
    <Page
      title="Theme tokens"
      intro="The semantic colours designers pick in Figma. Use these in component code. The swatches read the live CSS variables, so they show what the app renders for each product."
    >
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <input
          type="search"
          placeholder="Filter, e.g. button or error"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          style={{
            ...mono,
            padding: '6px 10px',
            width: '280px',
            border: `1px solid ${colour.border.secondary}`,
            borderRadius: '6px',
          }}
        />
        <label style={{ fontSize: '13px' }}>
          <input
            type="checkbox"
            checked={onlyDifferent}
            onChange={(event) => setOnlyDifferent(event.target.checked)}
          />{' '}
          Only tokens that differ between CRN and GP2
        </label>
      </div>
      {['foreground', 'background', 'border'].map((group) => {
        const tokens = visible.filter((t) => groupOf(t.figmaName) === group);
        return (
          tokens.length > 0 && (
            <Section key={group} title={`colour / ${group}`}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={headCell}>CRN</th>
                    <th style={headCell}>GP2</th>
                    <th style={headCell}>Figma variable</th>
                    <th style={headCell}>Code (click to copy)</th>
                    <th style={headCell}>Resolves to</th>
                    {group === 'foreground' && (
                      <th style={headCell}>Contrast</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((token) => (
                    <tr key={token.figmaName}>
                      <td style={cell}>
                        <Swatch
                          background={`var(${token.cssVariable})`}
                          label={token.crn.hex}
                        />
                      </td>
                      <td style={cell}>
                        <span data-app="gp2" style={{ display: 'contents' }}>
                          <Swatch
                            background={`var(${token.cssVariable})`}
                            label={token.gp2.hex}
                          />
                        </span>
                      </td>
                      <td style={cell}>{code(token.figmaName)}</td>
                      <td style={cell}>
                        <Copy text={token.codeName} />
                        <div style={muted}>var({token.cssVariable})</div>
                      </td>
                      <td style={{ ...cell, ...muted }}>
                        {(['crn', 'gp2'] as const).map(
                          (product) =>
                            token[product].figma && (
                              <div key={product}>
                                <Chip kind="amber">
                                  {product.toUpperCase()} overridden
                                </Chip>{' '}
                                Figma{' '}
                                <Colour
                                  value={token[product].figma?.hex ?? ''}
                                  label={`${
                                    token[product].figma?.alias?.replace(
                                      'colour/',
                                      '',
                                    ) ?? ''
                                  } ${token[product].figma?.hex}`}
                                />
                              </div>
                            ),
                        )}
                        {token.gp2.hex === token.crn.hex ? (
                          <div>
                            <Colour
                              value={cssColour(token.crn.hex, token.crn.alpha)}
                              label={`${token.crn.alias ?? ''} ${
                                token.crn.hex
                              }${
                                token.crn.alpha !== 1
                                  ? ` ${token.crn.alpha * 100}%`
                                  : ''
                              }`}
                            />
                          </div>
                        ) : (
                          (['crn', 'gp2'] as const).map((product) => (
                            <div key={product}>
                              {product.toUpperCase()}{' '}
                              <Colour
                                value={cssColour(
                                  token[product].hex,
                                  token[product].alpha,
                                )}
                                label={`${token[product].alias ?? ''} ${
                                  token[product].hex
                                }`}
                              />
                            </div>
                          ))
                        )}
                      </td>
                      {group === 'foreground' && (
                        <td style={cell}>
                          {token.crn.alpha === 1 &&
                            !token.figmaName.includes('button/tertiary') && (
                              <>
                                {contrastProducts(token).map((product) => (
                                  <div key={product}>
                                    <ContrastBadge
                                      foreground={token[product].hex}
                                      background={
                                        contrastBackground(
                                          token.figmaName,
                                          product,
                                        ).hex
                                      }
                                    />
                                    {contrastProducts(token).length > 1 && (
                                      <span style={muted}>
                                        {' '}
                                        {product.toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                ))}
                                <div style={muted}>
                                  {
                                    contrastBackground(token.figmaName, 'crn')
                                      .label
                                  }
                                </div>
                              </>
                            )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )
        );
      })}
    </Page>
  );
};

const PrimitiveCard = ({ primitive }: { primitive: Primitive }) => {
  const { copied, copy } = useCopy(primitive.codeName);
  const usedBy = themeTokensByPrimitive.get(primitive.figmaName);
  return (
    <button
      type="button"
      title={[
        `Click to copy ${primitive.codeName}`,
        ...(usedBy
          ? [
              '',
              'Used by:',
              ...usedBy.map((name) => name.replace('colour/', '')),
            ]
          : []),
      ].join('\n')}
      onClick={copy}
      style={{
        width: '96px',
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        alignSelf: 'flex-start',
        border: `1px solid ${colour.border.tertiary}`,
        borderRadius: '6px',
        background: colour.background.primary,
        cursor: 'pointer',
        textAlign: 'left',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '44px',
          width: '100%',
          background: `linear-gradient(${cssColour(
            primitive.hex,
            primitive.alpha,
          )}, ${cssColour(
            primitive.hex,
            primitive.alpha,
          )}), repeating-conic-gradient(${colour.neutral[100]} 0% 25%, ${
            colour.neutral[0]
          } 0% 50%) 0 0 / 10px 10px`,
        }}
      />
      <div style={{ padding: '4px 6px' }}>
        <div style={{ fontSize: '12px', fontWeight: 500 }}>
          {copied ? 'copied' : primitive.step}
        </div>
        <div style={muted}>{primitive.hex}</div>
        {usedBy && (
          <div style={{ ...muted, fontSize: '10px' }}>
            used by {usedBy.length} token{usedBy.length > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </button>
  );
};

const primitiveMatches = (primitive: Primitive, query: string) => {
  const needle = query.trim().toLowerCase().replace(/^#/, '');
  if (!needle) return true;
  return [
    primitive.figmaName,
    primitive.codeName,
    primitive.hex.replace('#', ''),
    ...(themeTokensByPrimitive.get(primitive.figmaName) ?? []),
  ].some((text) => text.toLowerCase().includes(needle));
};

export const Primitives = () => {
  const [query, setQuery] = useState('');
  const [onlyUsed, setOnlyUsed] = useState(false);
  const ramps = primitiveRamps
    .map(({ ramp, steps }) => ({
      ramp,
      steps: steps.filter(
        (primitive) =>
          primitiveMatches(primitive, query) &&
          (!onlyUsed || themeTokensByPrimitive.has(primitive.figmaName)),
      ),
    }))
    .filter(({ steps }) => steps.length > 0);
  return (
    <Page
      title="Primitives"
      intro={
        <>
          The raw palette (Figma collection primitives, ARIA ramps left out).
          Prefer theme tokens; reach for a primitive only when no theme token
          fits. Click a swatch to copy its code name, e.g.{' '}
          {code('colour.neutral[100]')}. &quot;used by&quot; counts the theme
          tokens built on it (hover to see them).
        </>
      }
    >
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <input
          type="search"
          placeholder="Search a name, hex or token"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          style={{
            ...mono,
            padding: '6px 10px',
            width: '320px',
            border: `1px solid ${colour.border.secondary}`,
            borderRadius: '6px',
          }}
        />
        <label style={{ fontSize: '13px' }}>
          <input
            type="checkbox"
            checked={onlyUsed}
            onChange={(event) => setOnlyUsed(event.target.checked)}
          />{' '}
          Only colours used by a theme token
        </label>
      </div>
      {ramps.length === 0 && (
        <p style={muted}>No primitive matches &quot;{query}&quot;.</p>
      )}
      {ramps.map(({ ramp, steps }) => (
        <Section key={ramp} title={ramp}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {steps.map((primitive) => (
              <PrimitiveCard key={primitive.figmaName} primitive={primitive} />
            ))}
          </div>
        </Section>
      ))}
    </Page>
  );
};

const statusChip = (before: string, after: string) =>
  before.toUpperCase() === after.toUpperCase() ? (
    <Chip kind="green">same colour</Chip>
  ) : (
    <Chip kind="amber">closest CAS colour</Chip>
  );

const BeforeAfter = ({ before, after }: { before: string; after: string }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
    <Swatch background={before} size={20} label={before} />
    <span style={muted}>{before}</span>
    {after && (
      <>
        <span style={muted}>→</span>
        <Swatch background={after} size={20} label={after} />
        <span style={muted}>{after}</span>
      </>
    )}
  </span>
);

export const LegacyNames = () => (
  <Page
    title="Legacy names"
    intro={
      <>
        The colour names the code used before CAS, the colour production shows,
        and the CAS name used in its place today (CRN values). None of the old
        names are used any more, except {code('magenta')} and {code('iris')},
        which have no CAS equivalent. <b>Same colour</b>: only the name changed.{' '}
        <b>Closest CAS colour</b>: CAS has no exact match, so the Hub uses the
        nearest one until design decides (see <i>Design Questions</i>
        ).
      </>
    }
  >
    <Section title="Old name to CAS name">
      <table style={table}>
        <thead>
          <tr>
            <th style={headCell}>Old name</th>
            <th style={headCell}>Production → now (CRN)</th>
            <th style={headCell}>Match</th>
            <th style={headCell}>Now called</th>
          </tr>
        </thead>
        <tbody>
          {oldNames.map(({ name, before, now, where }) => {
            const after = casHex(now) || before;
            return (
              <tr key={`${name}-${now}`}>
                <td style={cell}>{code(name)}</td>
                <td style={cell}>
                  <BeforeAfter before={before} after={after} />
                </td>
                <td style={cell}>{statusChip(before, after)}</td>
                <td style={cell}>
                  <div style={mono}>
                    {now.includes('kept') ? now : `colour.${now}`}
                  </div>
                  <div style={muted}>{where}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Section>
  </Page>
);

const HubSwatch = ({ hex, label }: { hex: string; label?: string }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
    <Swatch background={hex} size={20} label={hex} />
    <span style={mono}>{label ?? hex}</span>
  </span>
);

const figmaFixes = [
  'color-brand, one of the five avatar pairs, is a theme token, but its CRN and GP2 values point at the ARIA primitives brand/aria/2/200 and 2/900, so avatars show the ARIA green in every Hub.',
  'In the Navigation component, the hover and active fills of the Menu, Close and Account buttons are bound straight to the primitive brand/aria/1/900-A32 instead of a theme token, so they stay ARIA green in the CRN and GP2 modes.',
  'Some layers use raw hex instead of variables: the Checkbox and Radio label (#000000), the event live indicator, Icon Badge and the legacy Top Nav GP2 frame.',
  'The 48px icon-only Warning button hover is bound to the default variable, and the Search input placeholder uses a different token at each size.',
  'In GP2, background/brand-inverse (gp2/800) is darker than background/hover-brand-inverse (gp2/600). In CRN it is the other way round.',
  'background/brand, background/hover-brand and background/highlight all resolve to brand/25: three names for one value.',
  'No variable has a description or WEB code syntax. With code syntax set, Dev Mode shows engineers exactly what to type, for example colour.foreground.brand.',
];

type Shade = { label?: string; hex: string };
type CodeShade = {
  label: string;
  code: string;
  product?: Product;
  alpha?: number;
};

const codeShade = ({
  label,
  code,
  product = 'crn',
  alpha,
}: CodeShade): Shade => {
  const hex = casHex(code, product);
  return { label, hex: alpha === undefined ? hex : cssColour(hex, alpha) };
};

const missingNames: {
  name: string;
  hub: Shade[];
  now: CodeShade[];
  suggestion: string;
}[] = [
  {
    name: 'Strong brand text (hovered menu items, selected side-menu item, tag hover border)',
    hub: [
      { label: 'CRN', hex: '#287953' },
      { label: 'GP2', hex: '#006A92' },
    ],
    now: [
      { label: 'CRN foreground/brand', code: 'foreground.brand' },
      {
        label: 'GP2 foreground/brand',
        code: 'foreground.brand',
        product: 'gp2',
      },
    ],
    suggestion: 'Add foreground/brand-strong pointing at brand/800.',
  },
  {
    name: 'Tooltip background',
    hub: [{ hex: '#004561' }],
    now: [{ label: 'primitive brand/gp2/900', code: 'brand.gp2[900]' }],
    suggestion: 'Add background/tooltip.',
  },
  {
    name: 'Hint and placeholder text',
    hub: [{ hex: '#C2C9CE' }],
    now: [{ label: 'foreground/disabled', code: 'foreground.disabled' }],
    suggestion:
      'Add foreground/placeholder, so hints are not tied to disabled text.',
  },
  {
    name: 'Disabled button text (darker than other disabled text)',
    hub: [{ hex: '#4D646B' }],
    now: [{ label: 'foreground/tertiary', code: 'foreground.tertiary' }],
    suggestion:
      'Decide if buttons use foreground/disabled like everything else.',
  },
  {
    name: 'Checkbox and radio hover border',
    hub: [{ hex: '#4D646B' }],
    now: [{ label: 'primitive neutral/600', code: 'neutral[600]' }],
    suggestion:
      'Add border/hover, or use border/brand as the Figma components do.',
  },
  {
    name: 'Darker status text (toasts, status pills and cards)',
    hub: [
      { label: 'success', hex: '#287953' },
      { label: 'info', hex: '#006A92' },
      { label: 'warning', hex: '#B56B0B' },
    ],
    now: [
      { label: 'foreground/success', code: 'foreground.success' },
      { label: 'foreground/info', code: 'foreground.info' },
      { label: 'foreground/warning', code: 'foreground.warning' },
    ],
    suggestion:
      'Add foreground/{status}-strong, which would also fix readability.',
  },
  {
    name: 'Warning button border',
    hub: [{ hex: '#B00A1A' }],
    now: [
      { label: 'primitive utilitarian/red/700', code: 'utilitarian.red[700]' },
    ],
    suggestion: 'Add border/button/utilitarian/error.',
  },
  {
    name: 'Table stripes',
    hub: [{ hex: '#F6F9FB' }],
    now: [{ label: 'primitive neutral/50', code: 'neutral[50]' }],
    suggestion: 'Add background/row-alternate.',
  },
  {
    name: 'Overlay on the profile photo',
    hub: [{ label: 'black at 50%', hex: 'rgba(0, 0, 0, 0.5)' }],
    now: [
      {
        label: 'primitive neutral/900 at 50%',
        code: 'neutral[900]',
        alpha: 0.5,
      },
    ],
    suggestion: 'Add background/overlay.',
  },
  {
    name: 'Focus ring on status dropdowns',
    hub: [{ label: 'grey at 70%', hex: 'rgba(194, 201, 206, 0.7)' }],
    now: [
      {
        label: 'border/secondary at 70%',
        code: 'border.secondary',
        alpha: 0.7,
      },
    ],
    suggestion: 'Add border/focus.',
  },
];

const AvatarRow = ({ pairs }: { pairs: string[][] }) => (
  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
    {pairs.map(([background, text]) => (
      <div key={`${background}-${text}`} style={{ textAlign: 'center' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background,
            color: text,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            margin: '0 auto 4px',
          }}
        >
          AB
        </div>
        <div style={{ ...mono, fontSize: '10px' }}>{background}</div>
        <div style={{ ...mono, fontSize: '10px' }}>{text}</div>
      </div>
    ))}
  </div>
);

const ShadeList = ({ shades }: { shades: Shade[] }) => (
  <div style={{ display: 'grid', gap: '6px' }}>
    {shades.map(({ label, hex }) => (
      <div key={`${label}-${hex}`}>
        <HubSwatch hex={hex} label={label ? `${label} ${hex}` : hex} />
      </div>
    ))}
  </div>
);

const noCloseMatch: {
  use: string;
  hub: string;
  figma: string;
  suggestion: string;
}[] = [
  {
    use: 'Main text',
    hub: '#00222C',
    figma: 'foreground/primary: neutral/900 #1C1F21',
    suggestion:
      'The Hub text is a dark blue-grey; CAS text is neutral black. Add #00222C as a primitive, or accept neutral/900.',
  },
  {
    use: 'Error text and borders',
    hub: '#CD1426',
    figma: 'foreground/error: utilitarian/red/600 #D92D20',
    suggestion: 'Add #CD1426, or accept red/600.',
  },
  {
    use: 'Hover in dropdowns, selects and tags (CRN)',
    hub: '#E4F5EE',
    figma: 'background/hover-brand: brand/crn/25 #E2EEED',
    suggestion: 'Close enough to keep; or add #E4F5EE.',
  },
  {
    use: 'Borders and dividers',
    hub: '#DFE5EA',
    figma: 'border/tertiary: neutral/100 #E3E6E8',
    suggestion: 'Close enough to keep.',
  },
];

const TableSearch = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) => (
  <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '8px 0' }}>
    <input
      type="search"
      aria-label={placeholder}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      style={{
        ...mono,
        padding: '6px 10px',
        width: '260px',
        border: `1px solid ${colour.border.secondary}`,
        borderRadius: '6px',
      }}
    />
  </div>
);

const matches = (row: unknown, query: string) =>
  JSON.stringify(row).toLowerCase().includes(query.trim().toLowerCase());

const NoMatch = ({ columns, query }: { columns: number; query: string }) => (
  <tr>
    <td style={{ ...cell, ...muted }} colSpan={columns}>
      Nothing matches &quot;{query}&quot;.
    </td>
  </tr>
);

export const DesignQuestions = () => {
  const [changesQuery, setChangesQuery] = useState('');
  const [noMatchQuery, setNoMatchQuery] = useState('');
  const [namesQuery, setNamesQuery] = useState('');
  const changes = figmaChanges.filter((row) => matches(row, changesQuery));
  const noClose = noCloseMatch.filter((row) => matches(row, noMatchQuery));
  const names = missingNames.filter((row) => matches(row, namesQuery));
  return (
    <Page
      title="Questions for design"
      intro={
        <>
          The goal: the Hub looks exactly as it does in production, the code
          uses the CAS names from Figma, and Figma holds the right colour for
          each name. The code already uses the names. Where a name&apos;s CRN or
          GP2 value in Figma differs from production, the code temporarily
          points the name at the closest CAS colour (
          {code('asap-overrides.json')}). Each entry below is a change we ask of
          the CAS file; once Figma matches, the override is removed and nothing
          else changes.
        </>
      }
    >
      <Section title="1. Point these names at the Hub's colours">
        <p style={{ marginTop: 0 }}>
          In every row, the name&apos;s colour in Figma today differs from
          production. <b>Hub uses now</b> is what the code shows until Figma is
          updated (from {code('asap-overrides.json')}); <b>Ask design</b> is the
          change we request in Figma. <b>Colour exists in CAS</b>: the palette
          already has production&apos;s colour, so the fix is to point the name
          at it. <b>Colour missing from CAS</b>: the palette has no exact match;
          either add production&apos;s colour or accept the closest one.
        </p>
        <TableSearch
          value={changesQuery}
          onChange={setChangesQuery}
          placeholder="Search a name, product or hex"
        />
        <table style={table}>
          <thead>
            <tr>
              <th style={headCell}>Name</th>
              <th style={headCell}>Product</th>
              <th style={headCell}>Figma today</th>
              <th style={headCell}>Production</th>
              <th style={headCell}>Hub uses now</th>
              <th style={headCell}>Ask design</th>
            </tr>
          </thead>
          <tbody>
            {changes.length === 0 && (
              <NoMatch columns={6} query={changesQuery} />
            )}
            {changes.map(({ figmaName, product, figma, use, master }) => {
              const exact = use.hex.toUpperCase() === master.toUpperCase();
              return (
                <tr key={`${figmaName}-${product}`}>
                  <td style={cell}>{code(figmaName)}</td>
                  <td style={cell}>{product.toUpperCase()}</td>
                  <td style={cell}>
                    <HubSwatch
                      hex={figma.hex}
                      label={`${figma.alias?.replace('colour/', '') ?? ''} ${
                        figma.hex
                      }`}
                    />
                  </td>
                  <td style={cell}>
                    <HubSwatch hex={master} />
                  </td>
                  <td style={cell}>
                    <HubSwatch
                      hex={use.hex}
                      label={`${use.alias?.replace('colour/', '') ?? ''} ${
                        use.hex
                      }`}
                    />
                  </td>
                  <td style={cell}>
                    {exact ? (
                      <Chip kind="green">colour exists in CAS</Chip>
                    ) : (
                      <Chip kind="amber">colour missing from CAS</Chip>
                    )}
                    <div style={muted}>
                      {exact ? (
                        <>
                          Point to{' '}
                          <Colour
                            value={use.hex}
                            label={use.alias?.replace('colour/', '')}
                          />
                        </>
                      ) : (
                        <>
                          Add <Colour value={master} />, or accept{' '}
                          <Colour
                            value={use.hex}
                            label={`${use.alias?.replace('colour/', '')} ${
                              use.hex
                            }`}
                          />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Section>

      <Section title="2. Hub colours with no close CAS colour">
        <p style={{ marginTop: 0 }}>
          For these, Figma&apos;s current value is already the closest CAS
          colour, so the Hub uses it as is and looks slightly different from
          production.
        </p>
        <TableSearch
          value={noMatchQuery}
          onChange={setNoMatchQuery}
          placeholder="Search a use, name or hex"
        />
        <table style={table}>
          <thead>
            <tr>
              <th style={headCell}>Used for</th>
              <th style={headCell}>Production</th>
              <th style={headCell}>Figma today</th>
              <th style={headCell}>Suggestion</th>
            </tr>
          </thead>
          <tbody>
            {noClose.length === 0 && (
              <NoMatch columns={4} query={noMatchQuery} />
            )}
            {noClose.map(({ use, hub, figma, suggestion }) => (
              <tr key={use}>
                <td style={cell}>{use}</td>
                <td style={cell}>
                  <HubSwatch hex={hub} />
                </td>
                <td style={cell}>
                  <HubSwatch
                    hex={figma.split(' ').pop() as string}
                    label={figma}
                  />
                </td>
                <td style={{ ...cell, ...muted }}>
                  <Rich text={suggestion} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="3. Names CAS does not have yet">
        <p style={{ marginTop: 0 }}>
          The Hub uses these colours, but no CAS name fits, so the code uses the
          nearest name or a primitive for now.
        </p>
        <TableSearch
          value={namesQuery}
          onChange={setNamesQuery}
          placeholder="Search a use, name or hex"
        />
        <table style={table}>
          <thead>
            <tr>
              <th style={headCell}>Used for</th>
              <th style={headCell}>Production</th>
              <th style={headCell}>Code uses now</th>
              <th style={headCell}>Suggestion</th>
            </tr>
          </thead>
          <tbody>
            {names.length === 0 && <NoMatch columns={4} query={namesQuery} />}
            {names.map(({ name, hub, now, suggestion }) => (
              <tr key={name}>
                <td style={cell}>{name}</td>
                <td style={cell}>
                  <ShadeList shades={hub} />
                </td>
                <td style={cell}>
                  <ShadeList shades={now.map(codeShade)} />
                </td>
                <td style={{ ...cell, ...muted }}>
                  <Rich text={suggestion} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="4. Avatars without a photo">
        <p style={{ marginTop: 0 }}>
          Production has six colour pairs, including a pink and a purple. CAS
          has five pairs (color-*) and nothing close to the pink{' '}
          <Colour value="#9A2386" /> or the purple <Colour value="#693B77" />,
          and color-brand is the ARIA green. The code keeps the five CAS pairs.
          Should CAS add ASAP pairs that match production, or is the CAS set
          fine?
        </p>
        <div style={{ ...muted, marginBottom: '6px' }}>Production</div>
        <AvatarRow
          pairs={[
            ['#E4F5EE', '#287953'],
            ['#F8EDDE', '#CE801A'],
            ['#E6F3F9', '#006A92'],
            ['#E7F7FE', '#004561'],
            ['#F8EAF7', '#9A2386'],
            ['#F2EDF5', '#693B77'],
          ]}
        />
        <div style={{ ...muted, margin: '12px 0 6px' }}>CAS (code now)</div>
        <AvatarRow
          pairs={['yellow', 'green', 'lavender', 'blue', 'brand'].map(
            (name) => [
              casHex(`background['color-${name}']`),
              casHex(`foreground['color-${name}']`),
            ],
          )}
        />
      </Section>

      <Section title="5. Readability">
        <p style={{ marginTop: 0 }}>
          Matching production keeps some colours below the readability minimum
          (4.5:1 for normal text):
        </p>
        <ul style={{ paddingLeft: '20px' }}>
          <li>
            Links and the white text on the main button: CRN{' '}
            <ContrastBadge foreground="#34A270" background="#FFFFFF" />, GP2{' '}
            <ContrastBadge foreground="#0C8DC3" background="#FFFFFF" />.
          </li>
          <li>
            Hint text:{' '}
            <ContrastBadge foreground="#C5CACE" background="#FFFFFF" />.
          </li>
          <li>
            Status text on its light background, e.g. success{' '}
            <ContrastBadge foreground="#34A270" background="#F1FCF6" /> and
            warning <ContrastBadge foreground="#B88500" background="#FCF8EE" />.
          </li>
        </ul>
        <p>
          Keep production&apos;s look, or move these to darker shades (for
          example brand/800: CRN{' '}
          <ContrastBadge foreground="#287953" background="#FFFFFF" />, GP2{' '}
          <ContrastBadge foreground="#006A92" background="#FFFFFF" />
          )?
        </p>
      </Section>

      <Section title="6. One deliberate difference from production">
        <p style={{ marginTop: 0 }}>
          In GP2, checked radio buttons showed the CRN green{' '}
          <Colour value="#34A270" /> (a bug). They now use the GP2 blue{' '}
          <Colour value="#0C8DC3" />, like GP2 checkboxes and switches.
        </p>
      </Section>

      <Section title="Fixes we ask of the CAS Figma file">
        <ol style={{ paddingLeft: '20px', marginTop: 0 }}>
          {figmaFixes.map((fix) => (
            <li key={fix}>
              <Rich text={fix} />
            </li>
          ))}
        </ol>
      </Section>

      <Section title="How to read the readability badges">
        <p style={{ marginTop: 0 }}>
          The number on each badge, for example 3.51:1, is the{' '}
          <b>contrast ratio</b> between the text colour and its background. It
          compares how bright the two colours are. It goes from 1:1 (text the
          same colour as its background, invisible) to 21:1 (black on white).
          The higher the number, the easier the text is to read.
        </p>
        <p>
          <b>WCAG</b> (Web Content Accessibility Guidelines) is the standard
          rulebook for making websites usable by everyone, including people with
          low vision or colour blindness. Its rules come in three levels, each
          stricter than the one before:
        </p>
        <table style={{ ...table, maxWidth: '760px' }}>
          <thead>
            <tr>
              <th style={headCell}>Level</th>
              <th style={headCell}>What it means</th>
              <th style={headCell}>Text contrast it asks for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={cell}>A</td>
              <td style={cell}>The basics</td>
              <td style={cell}>No contrast rule</td>
            </tr>
            <tr>
              <td style={cell}>
                <b>AA</b>
              </td>
              <td style={cell}>
                <b>
                  The usual target, and what accessibility laws and contracts
                  normally ask for. This is what we aim for.
                </b>
              </td>
              <td style={cell}>
                <b>4.5:1 normal text, 3:1 large text</b>
              </td>
            </tr>
            <tr>
              <td style={cell}>AAA</td>
              <td style={cell}>
                The strictest. Rarely met across a whole site.
              </td>
              <td style={cell}>7:1 normal text, 4.5:1 large text</td>
            </tr>
          </tbody>
        </table>
        <p>So for the Hub, the minimums are:</p>
        <ul style={{ paddingLeft: '20px' }}>
          <li>
            <b>4.5:1 for normal text</b>, which covers most text on the Hub.
          </li>
          <li>
            <b>3:1 for large text</b> (24px and above, or 19px and above in
            bold), and for icons and borders that people need to see.
          </li>
          <li>
            No minimum for disabled buttons and fields, since they can&apos;t be
            used.
          </li>
        </ul>
        <p>The badges follow those minimums:</p>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <span>
            <ContrastBadge foreground="#1C1F21" background="#FFFFFF" /> 4.5:1 or
            more: fine for any text
          </span>
          <span>
            <ContrastBadge foreground="#079455" background="#DCFAE6" /> 3:1 to
            4.5:1: fine for large text and icons only
          </span>
          <span>
            <ContrastBadge foreground="#92999E" background="#FFFFFF" /> below
            3:1: too faint for any text
          </span>
        </div>
        <p style={muted}>
          So a badge showing 3.51:1 means the colour pair is fine for a large
          heading or an icon, but too faint for normal-sized text.
        </p>
      </Section>
    </Page>
  );
};
