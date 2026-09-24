import { CSSProperties, ReactNode, useState } from 'react';
import { colour } from '@asap-hub/react-components';
import {
  cssColour,
  legacyHex,
  legacyNames,
  legacyNamesByHex,
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
      <ol style={{ paddingLeft: '20px' }}>
        <li>
          <b>Theme tokens</b> ({code('colour.foreground.*')},{' '}
          {code('colour.background.*')}, {code('colour.border.*')}). These are
          what designers use in Figma. Each one has a CRN value and a GP2 value,
          so shared components get the right product colour automatically. See{' '}
          <i>Theme Tokens</i>.
        </li>
        <li>
          <b>Primitives</b> ({code('colour.neutral[100]')}), only when no theme
          token fits, for example a shadow. See <i>Primitives</i>.
        </li>
        <li>
          <b>Never the old names</b> ({code('neutral500')}, {code('charcoal')},{' '}
          {code('success100')}…). They are marked deprecated and show struck
          through in the editor. <i>Legacy Names</i> lists what replaces each
          one.
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
          support them. Use primitives there.
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
  const legacy =
    primitive.alpha === 1 ? legacyNamesByHex.get(primitive.hex) : [];
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
        {legacy && legacy.length > 0 && (
          <div style={{ ...muted, fontSize: '10px' }}>
            old: {legacy.join(', ')}
          </div>
        )}
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
    ...(legacyNamesByHex.get(primitive.hex) ?? []),
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
          {code('colour.neutral[100]')}. &quot;old&quot; lists deprecated names
          that currently hold that exact value, and &quot;used by&quot; lists
          the theme tokens built on it.
        </>
      }
    >
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <input
          type="search"
          placeholder="Search a name, hex, old name or token"
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
  ready: <Chip kind="green">replace now, same colour</Chip>,
  changes: <Chip kind="amber">replace, colour shifts</Chip>,
  design: <Chip kind="grey">waiting on design</Chip>,
};

const BeforeAfter = ({ before, after }: { before: string; after: string }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
    <Swatch background={before} size={20} label={before} />
    <span style={muted}>{before}</span>
    <span style={muted}>→</span>
    <Swatch background={after} size={20} label={after} />
    <span style={muted}>{after}</span>
  </span>
);

export const LegacyNames = () => (
  <Page
    title="Legacy names"
    intro="Every old colour name, what it is today and what replaces it. Components move over one area at a time; each move should update this page."
  >
    <Section title="Old name to CAS token">
      <table style={table}>
        <thead>
          <tr>
            <th style={headCell}>Old name</th>
            <th style={headCell}>Before CAS → today</th>
            <th style={headCell}>Status</th>
            <th style={headCell}>Replace with</th>
          </tr>
        </thead>
        <tbody>
          {legacyNames.map(({ name, before, replacement, status, note }) => (
            <tr key={name}>
              <td style={cell}>{code(name)}</td>
              <td style={cell}>
                <BeforeAfter before={before} after={legacyHex(name)} />
              </td>
              <td style={cell}>{statusChip[status]}</td>
              <td style={cell}>
                {replacement && <div style={mono}>{replacement}</div>}
                {note && <div style={muted}>{note}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
    <Section title="Colours that change when a component adopts the CAS tokens">
      <p style={muted}>
        Figma is explicit about these, so they are not open questions, but they
        are visible and should be called out when the component moves.
      </p>
      <table style={table}>
        <tbody>
          {[
            [
              'CRN primary button',
              '#34A270',
              'colour/background/button/primary/default',
            ],
            ['CRN brand text and links', '#34A270', 'colour/foreground/brand'],
            [
              'Disabled button background',
              '#EEF3F6',
              'colour/background/disabled',
            ],
            ['Disabled button text', '#566066', 'colour/foreground/disabled'],
            ['Disabled button border', '#E3E6E8', 'colour/border/disabled'],
          ].map(([label, before, token]) => (
            <tr key={label}>
              <td style={cell}>{label}</td>
              <td style={cell}>
                <BeforeAfter
                  before={before as string}
                  after={themeHex(token as string)}
                />
              </td>
              <td style={cell}>{code(token as string)}</td>
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
} as const;

const sourceLabels = {
  today: 'Our Hub today',
  cas: 'CAS, from Figma',
  option: 'Option: darker CAS shade',
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

export const DesignQuestions = () => (
  <Page
    title="Questions for design"
    intro={
      <>
        We are switching the Hub colours to the CAS Design System in Figma. For
        the colours below, design needs to choose what to use. Every example is
        labelled: <b>Our Hub today</b> is what users see on the live Hub now,{' '}
        <b>CAS, from Figma</b> is the colour defined in the CAS file, with its
        Figma variable name.
      </>
    }
  >
    <Question
      number={1}
      title="Grey text"
      ask="Our grey text (dates, captions, hints) and the hint text inside empty form fields don't exist in CAS. Which CAS grey should each become?"
    >
      <Side source="today" columns={2}>
        <Sample name="Grey text" text="#4D646B">
          Updated 3 days ago
        </Sample>
        <Sample name="Hint text in empty fields" text="#92999E">
          Search for a team…
        </Sample>
      </Side>
      <Side source="cas">
        <Sample name="foreground/secondary" text={cas('foreground/secondary')}>
          Updated 3 days ago
        </Sample>
        <Sample name="foreground/tertiary" text={cas('foreground/tertiary')}>
          Updated 3 days ago
        </Sample>
        <Sample
          name="foreground/quaternary"
          text={cas('foreground/quaternary')}
        >
          Updated 3 days ago
        </Sample>
      </Side>
    </Question>

    <Question
      number={2}
      title="Success and info messages"
      ask="Success messages use the CRN green and info messages use the GP2 blue, in both Hubs. CAS has its own green and blue for these. Should we switch to the CAS ones?"
    >
      <Side source="today" columns={2}>
        <Sample name="Success" text="#287953" background="#E4F5EE">
          Your changes were saved.
        </Sample>
        <Sample name="Info" text="#006A92" background="#E6F3F9">
          Reminders are sent every Monday.
        </Sample>
      </Side>
      <Side source="cas" columns={2}>
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
      title="Colours missing from CAS"
      ask="These colours have no CAS equivalent. What should replace them?"
    >
      <h3 style={{ fontSize: '14px', margin: '8px 0 0' }}>
        Initials of users without a profile photo
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
      <Side source="cas" columns={5}>
        {['yellow', 'brand', 'green', 'lavender', 'blue'].map((name) => (
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

      <h3 style={{ fontSize: '14px', margin: '24px 0 0' }}>Gradients</h3>
      <Side source="today" columns={2}>
        <GradientSample
          name="Bar at the top of the header"
          stops={['#008CC6', '#34A270']}
        />
        <GradientSample
          name="Dashboard banner"
          stops={['#CF2FB3', '#008CC6']}
        />
        <GradientSample
          name="Onboarding footer"
          stops={['#8C4E9F', '#008CC6']}
        />
        <GradientSample
          name="Event attendance bar"
          stops={['#8C4E9F', '#0C8DC3', '#1491B2', '#299C86', '#34A270']}
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
        Tooltip background
      </h3>
      <Side source="today" columns={3}>
        <Sample name="Tooltip" text="#FFFFFF" background="#004561">
          Copied to clipboard
        </Sample>
      </Side>
      <Side source="cas" columns={3}>
        <Sample
          name="foreground/primary"
          text="#FFFFFF"
          background={cas('foreground/primary')}
        >
          Copied to clipboard
        </Sample>
        <Sample
          name="brand/gp2/900"
          text="#FFFFFF"
          background={colour.brand.gp2[900]}
        >
          Copied to clipboard
        </Sample>
      </Side>
    </Question>

    <Question
      number={4}
      title="Coloured text on light backgrounds is hard to read"
      ask="In CAS, coloured text on a light background of the same colour is below the minimum for readable text. Both rows below are CAS colours: can we use the darker CAS shade for the text?"
    >
      <Side source="cas" columns={4}>
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
      title="Disabled buttons"
      ask="In CAS a disabled button has pale grey text on grey with a dark grey border, which makes it stand out more than a normal button. Is that intended?"
    >
      <Side source="today" columns={2}>
        <ButtonSample
          name="Disabled button"
          text="#4D646B"
          background="#EDF1F3"
          border="#DFE5EA"
        />
      </Side>
      <Side source="cas" columns={2}>
        <ButtonSample
          name="Disabled button"
          text={cas('foreground/disabled')}
          background={cas('background/disabled')}
          border={cas('border/disabled')}
        />
        <ButtonSample
          name="Normal button, for comparison"
          text={cas('foreground/button/secondary/default')}
          background={cas('background/button/secondary/default')}
          border={cas('border/button/secondary/default')}
        />
      </Side>
    </Question>

    <Question
      number={6}
      title="Links and main buttons are hard to read"
      ask="Brand-coloured links and the white text on the main button are below the minimum for readable text in both Hubs, today and in CAS. Keep them, or use a darker green or blue?"
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
      <Side source="cas" columns={4}>
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
