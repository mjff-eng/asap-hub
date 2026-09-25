import { CSSProperties, ReactNode, useState } from 'react';
import { colour } from '@asap-hub/react-components';
import {
  casHex,
  cssColour,
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
  ContrastBadge,
  Copy,
  mono,
  muted,
  Page,
  Section,
  Swatch,
  TextSample,
  useCopy,
} from './ui';

export default {
  title: 'CAS Design System / Colours',
};

const code = (text: string) => <code style={mono}>{text}</code>;

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
const grid = (columns: string): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: columns,
  gap: '12px',
  alignItems: 'start',
});

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
            ['colour/foreground/primary', 'charcoal, neutral1000'],
            ['colour/border/tertiary', 'steel, neutral500'],
            ['colour/foreground/primary-inverse', 'paper'],
            [
              'colour/background/button/primary/default',
              'fern (CRN), primary500 (GP2)',
            ],
          ].map(([name, before]) => {
            const token = themeTokens.find((t) => t.figmaName === name);
            return (
              token && (
                <tr key={name}>
                  <td style={{ ...cell, ...muted }}>
                    {code(before as string)}
                  </td>
                  <td style={cell}>{code(token.figmaName)}</td>
                  <td style={cell}>
                    <Copy text={token.codeName} />
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
        brackets, for example {code("colour.foreground['primary-inverse']")}.
      </p>
    </Section>
    <Section title="Which colour to use">
      <p style={{ marginTop: 0 }}>
        Type the name the design shows. A frame that uses{' '}
        {code('colour/border/secondary')} becomes{' '}
        {code('colour.border.secondary')}. If design later points that token at
        another colour, re-exporting from Figma updates every screen with no
        code change.
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
          {code('colourWithAlpha(colour.border.secondary, 0.7)')}. It works with
          tokens and primitives and still follows the token value.
        </li>
        <li>
          <b>Primitives</b> ({code('colour.neutral[700]')}) only when a token
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
          <b>The old names are gone</b> ({code('neutral500')},{' '}
          {code('charcoal')}, {code('success100')}…). <i>Legacy Names</i>{' '}
          records what replaced each one, for anyone reading older code.
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
      </ol>
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
                        {token.gp2.hex === token.crn.hex ? (
                          <div>
                            {token.crn.alias ?? ''} {token.crn.hex}
                            {token.crn.alpha !== 1 &&
                              ` ${token.crn.alpha * 100}%`}
                          </div>
                        ) : (
                          (['crn', 'gp2'] as const).map((product) => (
                            <div key={product}>
                              {product.toUpperCase()}{' '}
                              {token[product].alias ?? ''} {token[product].hex}
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

const statusChip = {
  same: <Chip kind="green">same colour</Chip>,
  cas: <Chip kind="blue">CAS value</Chip>,
  approval: <Chip kind="amber">needs design approval</Chip>,
};

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
        The colour names the code used before CAS, and the CAS name that
        replaced each one. None of the old names are used any more, except{' '}
        {code('magenta')} and {code('iris')}, which have no CAS equivalent.{' '}
        <b>Same colour</b>: only the name changed. <b>CAS value</b>: the colour
        moved to the exact value Figma defines for that role.{' '}
        <b>Needs design approval</b>: our proposal, listed in{' '}
        <i>Design Questions</i>.
      </>
    }
  >
    <Section title="Old name to CAS name">
      <table style={table}>
        <thead>
          <tr>
            <th style={headCell}>Old name</th>
            <th style={headCell}>Before CAS → now (CRN)</th>
            <th style={headCell}>Status</th>
            <th style={headCell}>Now called</th>
          </tr>
        </thead>
        <tbody>
          {oldNames.map(({ name, before, now, where, status, question }) => (
            <tr key={`${name}-${now}`}>
              <td style={cell}>{code(name)}</td>
              <td style={cell}>
                <BeforeAfter before={before} after={casHex(now)} />
              </td>
              <td style={cell}>
                {statusChip[status]}
                {question && <div style={muted}>question {question}</div>}
              </td>
              <td style={cell}>
                <div style={mono}>
                  {now.includes('kept') ? now : `colour.${now}`}
                </div>
                {where && <div style={muted}>{where}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  </Page>
);

const sourceStyles = {
  today: [colour.background.tertiary, colour.foreground.tertiary],
  cas: [colour.background.info, colour.foreground.info],
  option: [colour.background.warning, colour.foreground.warning],
  pr: [colour.background.brand, colour.foreground.brand],
} as const;

const sourceLabels = {
  today: 'Our Hub today',
  cas: 'Other CAS options, from Figma',
  option: 'Option: darker CAS shade',
  pr: 'This PR, for approval',
};

const Side = ({
  source,
  columns = 3,
  children,
}: {
  source: keyof typeof sourceStyles;
  columns?: number;
  children: ReactNode;
}) => (
  <div style={{ margin: '12px 0' }}>
    <span
      style={{
        display: 'inline-block',
        marginBottom: '8px',
        padding: '2px 10px',
        borderRadius: '10px',
        fontSize: '12px',
        fontWeight: 500,
        background: sourceStyles[source][0],
        color: sourceStyles[source][1],
      }}
    >
      {sourceLabels[source]}
    </span>
    <div style={grid(`repeat(${columns}, 1fr)`)}>{children}</div>
  </div>
);

const Sample = ({
  name,
  text,
  background = '#FFFFFF',
  children,
}: {
  name: string;
  text: string;
  background?: string;
  children: ReactNode;
}) => (
  <TextSample foreground={text} background={background}>
    <div style={{ ...mono, fontSize: '11px' }}>{name}</div>
    <div style={{ ...mono, fontSize: '11px', opacity: 0.8 }}>
      {text}
      {background !== '#FFFFFF' && ` on ${background}`}
    </div>
    <div style={{ marginTop: '4px' }}>{children}</div>
  </TextSample>
);

const GradientSample = ({ name, stops }: { name: string; stops: string[] }) => (
  <div>
    <div
      style={{
        height: '28px',
        borderRadius: '6px',
        background: `linear-gradient(to right, ${stops.join(', ')})`,
      }}
    />
    <div style={{ ...mono, fontSize: '11px', marginTop: '4px' }}>{name}</div>
    <div style={muted}>{stops.join(' → ')}</div>
  </div>
);

const ButtonSample = ({
  name,
  text,
  background,
  border,
}: {
  name: string;
  text: string;
  background: string;
  border: string;
}) => (
  <div>
    <div style={{ ...mono, fontSize: '11px', marginBottom: '4px' }}>{name}</div>
    <span
      style={{
        display: 'inline-block',
        padding: '8px 16px',
        borderRadius: '4px',
        color: text,
        background,
        border: `1px solid ${border}`,
        fontWeight: 500,
      }}
    >
      Save
    </span>
    <div style={{ ...muted, marginTop: '4px' }}>
      text {text}, background {background}, border {border}
    </div>
  </div>
);

const Question = ({
  number,
  title,
  ask,
  children,
}: {
  number: number;
  title: string;
  ask: string;
  children: ReactNode;
}) => (
  <Section title={`${number}. ${title}`}>
    <p style={{ marginTop: 0 }}>{ask}</p>
    {children}
  </Section>
);

const cas = (name: string, product: Product = 'crn') =>
  themeHex(`colour/${name}`, product);

const Pair = ({
  product,
  children,
}: {
  product: Product;
  children: ReactNode;
}) =>
  product === 'gp2' ? (
    <span data-app="gp2" style={{ display: 'contents' }}>
      {children}
    </span>
  ) : (
    <>{children}</>
  );

const NamedSwatch = ({
  name,
  hex,
  note,
}: {
  name: string;
  hex: string;
  note?: string;
}) => (
  <div>
    <Swatch background={hex} label={hex} />
    <div style={{ ...mono, fontSize: '11px' }}>{name}</div>
    <div style={muted}>
      {note ? `${note}, ` : ''}
      {hex}
    </div>
  </div>
);

const figmaFixes = [
  'color-brand, one of the five avatar pairs, is a theme token, but its CRN and GP2 values point at the ARIA primitives brand/aria/2/200 and 2/900, so avatars show the ARIA green in every Hub. ASAP needs its own values, or four pairs.',
  'In the Navigation component, the hover and active fills of the Menu, Close and Account buttons are bound straight to the primitive brand/aria/1/900-A32 instead of a theme token, so they stay ARIA green in the CRN and GP2 modes.',
  'Shadows use colours that are invisible on white, so the code keeps its own shadow greys.',
  'Several component layers still use raw hex instead of variables: the Checkbox and Radio label (#000000) and the legacy Top Nav GP2 frame.',
  'The 48px icon-only Warning button hover is bound to the default variable.',
  'The Search input placeholder uses foreground/quaternary at Large but foreground/disabled at Small and Mobile.',
  'utilitarian/error/100 is used on the Event Card live indicator but is not a theme role.',
  'Missing roles we had to fill with primitives or neighbours: focus ring, icon, link, overlay, tooltip, table stripe (row alternate), and darker status text for labels.',
  'border/button/tertiary is red/700. Is it meant to be the destructive button border?',
  'border/disabled (#687883) is darker than the normal border (#E3E6E8), so disabled controls look more active than enabled ones.',
  'background/brand, background/hover-brand and background/highlight all resolve to brand/25: three names for one value.',
  'In GP2, background/brand-inverse (gp2/800) is darker than background/hover-brand-inverse (gp2/600). In CRN it is the other way round.',
  'No variable has a description or WEB code syntax. With code syntax set, Dev Mode shows engineers exactly what to type, for example colour.foreground.brand.',
];

export const DesignQuestions = () => (
  <Page
    title="Questions for design"
    intro={
      <>
        This PR moves every Hub colour onto the CAS Design System in Figma.
        Where Figma was clear we followed it. Where it was not, the PR contains
        our proposal, and it will not be merged until design approves it. Every
        example is labelled: <b>Our Hub today</b> is the live Hub,{' '}
        <b>This PR, for approval</b> is what this PR shows, and{' '}
        <b>Other CAS options</b> are alternatives from the CAS file. Use the{' '}
        <b>Product</b> menu in the toolbar to see the other Hub where a sample
        says so.
      </>
    }
  >
    <Question
      number={1}
      title="Grey text and hint text"
      ask="Our grey text (dates, captions) and the hint text inside empty fields are not CAS colours. This PR uses foreground/tertiary for both, as the CAS Input component does. Our old hint text was too faint to read (1.67:1). Is foreground/tertiary right for hints, or should they be the lighter foreground/quaternary so they look different from a typed value?"
    >
      <Side source="today" columns={2}>
        <Sample name="Grey text" text="#4D646B">
          Updated 3 days ago
        </Sample>
        <Sample name="Hint text in empty fields" text="#C2C9CE">
          Search for a team…
        </Sample>
      </Side>
      <Side source="pr" columns={2}>
        <Sample name="foreground/tertiary" text={cas('foreground/tertiary')}>
          Updated 3 days ago
        </Sample>
        <Sample name="foreground/tertiary" text={cas('foreground/tertiary')}>
          Search for a team…
        </Sample>
      </Side>
      <Side source="cas" columns={2}>
        <Sample name="foreground/secondary" text={cas('foreground/secondary')}>
          Updated 3 days ago
        </Sample>
        <Sample
          name="foreground/quaternary"
          text={cas('foreground/quaternary')}
        >
          Search for a team…
        </Sample>
      </Side>
    </Question>

    <Question
      number={2}
      title="Success and info colours"
      ask="Success and info used the CRN green and the GP2 blue, in both Hubs. This PR switches them to the CAS success green and info blue, which are the same in both Hubs. This affects success and info messages, status pills and tags, and the green and blue card accents. Is that right?"
    >
      <Side source="today" columns={2}>
        <Sample name="Success" text="#287953" background="#E4F5EE">
          Your changes were saved.
        </Sample>
        <Sample name="Info" text="#006A92" background="#E6F3F9">
          Reminders are sent every Monday.
        </Sample>
      </Side>
      <Side source="pr" columns={2}>
        <Sample
          name="foreground/success on background/success"
          text={cas('foreground/success')}
          background={cas('background/success')}
        >
          Your changes were saved.
        </Sample>
        <Sample
          name="foreground/info on background/info"
          text={cas('foreground/info')}
          background={cas('background/info')}
        >
          Reminders are sent every Monday.
        </Sample>
      </Side>
    </Question>

    <Question
      number={3}
      title="Colours that are not in CAS"
      ask="A few colours have no CAS role. For each one below, is our proposal right?"
    >
      <h3 style={{ fontSize: '14px', margin: '8px 0 0' }}>
        Initials of users without a profile photo: this PR uses the five CAS
        colour pairs instead of our six. One of them, color-brand, is built from
        the ARIA green. Is that acceptable on ASAP?
      </h3>
      <Side source="today" columns={6}>
        {[
          ['Light green / green', '#E4F5EE', '#287953'],
          ['Light orange / orange', '#F8EDDE', '#CE801A'],
          ['Light blue / blue', '#E6F3F9', '#006A92'],
          ['Pale blue / dark blue', '#E7F7FE', '#004561'],
          ['Light pink / berry', '#F8EAF7', '#9A2386'],
          ['Light purple / purple', '#F2EDF5', '#693B77'],
        ].map(([name, background, text]) => (
          <Sample
            key={name}
            name={name as string}
            text={text as string}
            background={background}
          >
            <b style={{ fontSize: '20px' }}>AB</b>
          </Sample>
        ))}
      </Side>
      <Side source="pr" columns={5}>
        {['yellow', 'green', 'lavender', 'blue', 'brand'].map((name) => (
          <Sample
            key={name}
            name={`color-${name}${name === 'brand' ? ' (ARIA green)' : ''}`}
            text={cas(`foreground/color-${name}`)}
            background={cas(`background/color-${name}`)}
          >
            <b style={{ fontSize: '20px' }}>AB</b>
          </Sample>
        ))}
      </Side>

      <h3 style={{ fontSize: '14px', margin: '24px 0 0' }}>
        Gradients: this PR keeps ours, built from CAS brand colours where they
        match (the two middle stops of the event attendance bar are not CAS
        colours). Should CAS add them as ASAP gradients, or should we use CAS
        ones?
      </h3>
      <Side source="pr" columns={2}>
        <GradientSample
          name="Bar at the top of the header"
          stops={[colour.brand.gp2[500], colour.brand.crn[500]]}
        />
        <GradientSample
          name="Dashboard banner"
          stops={['#CF2FB3', colour.brand.gp2[500]]}
        />
        <GradientSample
          name="Onboarding footer"
          stops={['#8C4E9F', colour.brand.gp2[500]]}
        />
        <GradientSample
          name="Event attendance bar"
          stops={[
            '#8C4E9F',
            colour.brand.gp2[500],
            '#1491B2',
            '#299C86',
            colour.brand.crn[500],
          ]}
        />
      </Side>
      <Side source="cas" columns={3}>
        {Object.entries(colour.general.gradient).map(([name, stops]) => (
          <GradientSample
            key={name}
            name={`gradient/${name}`}
            stops={Object.values(stops)}
          />
        ))}
      </Side>

      <h3 style={{ fontSize: '14px', margin: '24px 0 0' }}>
        Tooltip background: CAS has no tooltip role. This PR uses
        foreground/secondary, as the CAS Tooltip component does. Can CAS add a
        tooltip role so the component and the code share a name?
      </h3>
      <Side source="today" columns={3}>
        <Sample name="Tooltip" text="#FFFFFF" background="#004561">
          Copied to clipboard
        </Sample>
      </Side>
      <Side source="pr" columns={3}>
        <Sample
          name="foreground/secondary"
          text={cas('foreground/primary-inverse')}
          background={cas('foreground/secondary')}
        >
          Copied to clipboard
        </Sample>
      </Side>
    </Question>

    <Question
      number={4}
      title="Coloured text on light backgrounds is hard to read"
      ask="Toasts now follow the CAS Toast: dark text, with the status colour only on the icon and border. Status pills, tags and messages still use the CAS status pairs, and in all four the text is below the minimum for readable text. Keep them, or use the darker CAS shade for the text? If darker, could CAS add those as variables?"
    >
      <Side source="pr" columns={4}>
        {(['error', 'warning', 'success', 'info'] as const).map((status) => (
          <Sample
            key={status}
            name={`foreground/${status}`}
            text={cas(`foreground/${status}`)}
            background={cas(`background/${status}`)}
          >
            Something needs your attention.
          </Sample>
        ))}
      </Side>
      <Side source="option" columns={4}>
        {(
          [
            ['utilitarian/red/700', colour.utilitarian.red[700], 'error'],
            [
              'utilitarian/orange/700',
              colour.utilitarian.orange[700],
              'warning',
            ],
            ['utilitarian/green/700', colour.utilitarian.green[700], 'success'],
            ['utilitarian/blue/700', colour.utilitarian.blue[700], 'info'],
          ] as const
        ).map(([name, text, status]) => (
          <Sample
            key={name}
            name={name}
            text={text}
            background={cas(`background/${status}`)}
          >
            Something needs your attention.
          </Sample>
        ))}
      </Side>
    </Question>

    <Question
      number={5}
      title="Disabled buttons, fields and rows"
      ask="This PR uses the CAS disabled colours for buttons, fields, checkboxes, radios and unavailable rows. We left out the CAS disabled border on buttons, because border/disabled is darker than a normal border and made disabled buttons look more active than enabled ones. Checkboxes and radios keep it. Is that right?"
    >
      <Side source="today" columns={2}>
        <ButtonSample
          name="Disabled button"
          text="#4D646B"
          background="#EDF1F3"
          border="#DFE5EA"
        />
      </Side>
      <Side source="pr" columns={2}>
        <ButtonSample
          name="Disabled button"
          text={cas('foreground/disabled')}
          background={cas('background/disabled')}
          border="transparent"
        />
        <ButtonSample
          name="Normal button, for comparison"
          text={cas('foreground/button/secondary/default')}
          background={cas('background/button/secondary/default')}
          border={cas('border/button/secondary/default')}
        />
      </Side>
      <Side source="cas" columns={2}>
        <ButtonSample
          name="Disabled button with border/disabled"
          text={cas('foreground/disabled')}
          background={cas('background/disabled')}
          border={cas('border/disabled')}
        />
      </Side>
    </Question>

    <Question
      number={6}
      title="Links and main buttons"
      ask="This PR uses the CAS brand colours: links are foreground/brand and the main button is background/button/primary. They are a little darker than today, but still below the minimum for readable text (links 3.78:1 in CRN and 4.38:1 in GP2; button text 3.69:1 and 3.65:1). Keep the CAS colours, or use the darker brand/800, which passes?"
    >
      <Side source="today" columns={4}>
        <Sample name="CRN link" text="#34A270">
          <u>Link example</u>
        </Sample>
        <Sample name="GP2 link" text="#0C8DC3">
          <u>Link example</u>
        </Sample>
        <Sample name="CRN main button" text="#FFFFFF" background="#34A270">
          <b>Save</b>
        </Sample>
        <Sample name="GP2 main button" text="#FFFFFF" background="#0C8DC3">
          <b>Save</b>
        </Sample>
      </Side>
      <Side source="pr" columns={4}>
        <Sample
          name="CRN foreground/brand"
          text={cas('foreground/brand', 'crn')}
        >
          <u>Link example</u>
        </Sample>
        <Sample
          name="GP2 foreground/brand"
          text={cas('foreground/brand', 'gp2')}
        >
          <u>Link example</u>
        </Sample>
        <Sample
          name="CRN background/button/primary/default"
          text={cas('foreground/button/primary/default', 'crn')}
          background={cas('background/button/primary/default', 'crn')}
        >
          <b>Save</b>
        </Sample>
        <Sample
          name="GP2 background/button/primary/default"
          text={cas('foreground/button/primary/default', 'gp2')}
          background={cas('background/button/primary/default', 'gp2')}
        >
          <b>Save</b>
        </Sample>
      </Side>
      <Side source="option" columns={4}>
        <Sample name="brand/crn/800" text={colour.brand.crn[800]}>
          <u>Link example</u>
        </Sample>
        <Sample name="brand/gp2/800" text={colour.brand.gp2[800]}>
          <u>Link example</u>
        </Sample>
        <Sample
          name="brand/crn/800 (the CAS hover colour)"
          text="#FFFFFF"
          background={colour.brand.crn[800]}
        >
          <b>Save</b>
        </Sample>
        <Sample
          name="brand/gp2/800 (the CAS hover colour)"
          text="#FFFFFF"
          background={colour.brand.gp2[800]}
        >
          <b>Save</b>
        </Sample>
      </Side>
    </Question>

    <Question
      number={7}
      title="Highlight colour for hovered and selected items"
      ask="Hovered items in dropdowns, select lists, sort menus and tags, and the selected side-menu item and page number, now use CAS roles in each Hub's colour: background/hover-brand for hover and background/active for selected, with foreground/brand text. CAS's own Dropdown and Side Bar components use grey (background/hover) for hover and keep the brand tint for selected. Which do you want for hover? Note that foreground/brand on the hover tint is 3.18:1 in CRN, lower than today's 4.48:1."
    >
      <Side source="today" columns={2}>
        <Sample
          name="Side menu, selected item"
          text={colour.brand.crn[800]}
          background="#E7F7F0"
        >
          Projects
        </Sample>
        <Sample
          name="Dropdown, hovered item"
          text={colour.brand.crn[800]}
          background="#E4F5EE"
        >
          Not Requested
        </Sample>
      </Side>
      <Side source="pr" columns={4}>
        {(['crn', 'gp2'] as const).map((product) => (
          <Pair key={product} product={product}>
            <Sample
              name={`${product.toUpperCase()} background/active`}
              text={cas('foreground/brand', product)}
              background={cas('background/active', product)}
            >
              Projects
            </Sample>
            <Sample
              name={`${product.toUpperCase()} background/hover-brand`}
              text={cas('foreground/brand', product)}
              background={cas('background/hover-brand', product)}
            >
              Not Requested
            </Sample>
          </Pair>
        ))}
      </Side>
      <Side source="cas" columns={2}>
        <Sample
          name="background/hover (CAS components)"
          text={cas('foreground/secondary')}
          background={cas('background/hover')}
        >
          Not Requested
        </Sample>
      </Side>
    </Question>

    <Question
      number={8}
      title="Form controls"
      ask="This PR follows the CAS Input, Checkbox, Radio and Toggle components: focus and hover borders are border/brand, a checked checkbox is background/hover-brand-inverse, a checked radio and an active toggle are background/brand-inverse. In CRN the colours barely change. In GP2 the two blues are swapped compared with CRN, so a checked checkbox (#0681B2) is lighter than a checked radio (#006A92). Is that intended?"
    >
      <Side source="today" columns={3}>
        <NamedSwatch
          name="brand/crn/500"
          hex="#34A270"
          note="focus border, checked checkbox and radio; GP2 radios were CRN green"
        />
      </Side>
      <Side source="pr" columns={3}>
        {(
          [
            ['border/brand', 'focus and hover border'],
            ['background/hover-brand-inverse', 'checkbox checked'],
            ['background/brand-inverse', 'radio checked, toggle on'],
          ] as const
        ).map(([name, use]) =>
          (['crn', 'gp2'] as const).map((product) => (
            <NamedSwatch
              key={`${name}-${product}`}
              name={`${product.toUpperCase()} ${name}`}
              hex={cas(name, product)}
              note={use}
            />
          )),
        )}
      </Side>
    </Question>

    <Question
      number={9}
      title="Tabs, pagination and dividers"
      ask="This PR follows the CAS components for the selected tab (underline foreground/brand, brand/600 instead of brand/500) and the selected page (background/active with foreground/brand). Dividers stay border/tertiary (#E3E6E8), while the CAS Side Bar uses border/secondary (#C5CACE). Which divider colour do you want?"
    >
      <Side source="pr" columns={2}>
        <Sample
          name="Divider: border/tertiary"
          text={cas('foreground/primary')}
        >
          <div style={{ borderTop: `1px solid ${cas('border/tertiary')}` }} />
        </Sample>
      </Side>
      <Side source="cas" columns={2}>
        <Sample
          name="Divider: border/secondary"
          text={cas('foreground/primary')}
        >
          <div style={{ borderTop: `1px solid ${cas('border/secondary')}` }} />
        </Sample>
      </Side>
    </Question>

    <Question
      number={10}
      title="Table stripes"
      ask="Alternate table rows were #F6F9FB. CAS has no role for them and background/secondary (#FCFCFD) is invisible on white, so this PR uses the primitive neutral/50 (#FAFAFA). Should CAS add a row-alternate role, should stripes be background/tertiary (#EEF3F6), or should tables drop stripes?"
    >
      <Side source="today" columns={3}>
        <NamedSwatch name="Table stripe" hex="#F6F9FB" />
      </Side>
      <Side source="pr" columns={3}>
        <NamedSwatch name="neutral/50" hex={colour.neutral[50]} />
      </Side>
      <Side source="cas" columns={3}>
        <NamedSwatch
          name="background/tertiary"
          hex={cas('background/tertiary')}
        />
      </Side>
    </Question>

    <Question
      number={11}
      title="Status colours on things that are not statuses"
      ask="Two places now use a status colour because the old colour was mapped by meaning. The GP2 project Active stripe was the GP2 brand blue (#0C8DC3) and is now foreground/info (#1570EF). Green call-to-action cards were the brand mint and are now background/success with border/success. Should these be brand or status colours?"
    >
      <Side source="pr" columns={2}>
        <Sample
          name="CTA card: success"
          text={cas('foreground/primary')}
          background={cas('background/success')}
        >
          Get in touch
        </Sample>
        <Sample
          name="GP2 Active stripe: foreground/info"
          text={cas('foreground/info')}
        >
          Active
        </Sample>
      </Side>
      <Side source="cas" columns={2}>
        <Sample
          name="CTA card: brand"
          text={cas('foreground/primary')}
          background={cas('background/brand')}
        >
          Get in touch
        </Sample>
        <Sample
          name="GP2 Active stripe: foreground/brand"
          text={cas('foreground/brand', 'gp2')}
        >
          Active
        </Sample>
      </Side>
    </Question>

    <Question
      number={12}
      title="Event date block"
      ask="The date block on event cards uses background/brand. The CAS Event Card uses background/active for upcoming events and background/hover for past ones. Should we follow the Event Card?"
    >
      <Side source="pr" columns={3}>
        <Sample
          name="background/brand"
          text={cas('foreground/primary')}
          background={cas('background/brand')}
        >
          <b>12 MAR</b>
        </Sample>
      </Side>
      <Side source="cas" columns={3}>
        <Sample
          name="upcoming: background/active"
          text={cas('foreground/primary')}
          background={cas('background/active')}
        >
          <b>12 MAR</b>
        </Sample>
        <Sample
          name="past: background/hover"
          text={cas('foreground/primary')}
          background={cas('background/hover')}
        >
          <b>12 MAR</b>
        </Sample>
      </Side>
    </Question>

    <Section title="Fixes we ask of the CAS Figma file">
      <ol style={{ paddingLeft: '20px', marginTop: 0 }}>
        {figmaFixes.map((fix) => (
          <li key={fix}>{fix}</li>
        ))}
      </ol>
    </Section>

    <Section title="How to read the readability badges">
      <p style={{ marginTop: 0 }}>
        The number on each badge, for example 3.51:1, is the{' '}
        <b>contrast ratio</b> between the text colour and its background. It
        compares how bright the two colours are. It goes from 1:1 (text the same
        colour as its background, invisible) to 21:1 (black on white). The
        higher the number, the easier the text is to read.
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
            <td style={cell}>The strictest. Rarely met across a whole site.</td>
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
          <b>3:1 for large text</b> (24px and above, or 19px and above in bold),
          and for icons and borders that people need to see.
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
          <ContrastBadge foreground="#92999E" background="#FFFFFF" /> below 3:1:
          too faint for any text
        </span>
      </div>
      <p style={muted}>
        So a badge showing 3.51:1 means the colour pair is fine for a large
        heading or an icon, but too faint for normal-sized text.
      </p>
    </Section>
  </Page>
);
