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
            <th style={headCell}>Figma variable</th>
            <th style={headCell}>Code</th>
            <th style={headCell}>CSS variable</th>
          </tr>
        </thead>
        <tbody>
          {[
            'colour/foreground/primary',
            'colour/border/tertiary',
            'colour/foreground/primary-inverse',
            'colour/background/button/primary/default',
          ].map((name) => {
            const token = themeTokens.find((t) => t.figmaName === name);
            return (
              token && (
                <tr key={name}>
                  <td style={cell}>{code(token.figmaName)}</td>
                  <td style={cell}>
                    <Copy text={token.codeName} />
                  </td>
                  <td style={cell}>{code(`var(${token.cssVariable})`)}</td>
                </tr>
              )
            );
          })}
        </tbody>
      </table>
      <p>
        Swap each {code('/')} for {code('.')}. Parts with a hyphen go in
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
          <b>Primitives</b> ({code('colour.neutral[100].rgb')}), only when no
          theme token fits, for example a shadow. See <i>Primitives</i>.
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
  const [copied, setCopied] = useState(false);
  const legacy =
    primitive.alpha === 1 ? legacyNamesByHex.get(primitive.hex) : [];
  return (
    <button
      type="button"
      title={`Click to copy ${primitive.codeName}`}
      onClick={() =>
        navigator.clipboard?.writeText(primitive.codeName).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          },
          () => undefined,
        )
      }
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
          )}), repeating-conic-gradient(${colour.neutral[100].hex} 0% 25%, ${
            colour.neutral[0].hex
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
      </div>
    </button>
  );
};

export const Primitives = () => (
  <Page
    title="Primitives"
    intro={
      <>
        The raw palette (Figma collection primitives, ARIA ramps left out).
        Prefer theme tokens; reach for a primitive only when no theme token
        fits. Click a swatch to copy its code name, e.g.{' '}
        {code('colour.neutral[100].rgb')}. &quot;old&quot; lists deprecated
        names that currently hold that exact value.
      </>
    }
  >
    {primitiveRamps.map(({ ramp, steps }) => (
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
    <p style={{ marginTop: 0 }}>
      <b>Question:</b> {ask}
    </p>
    {children}
  </Section>
);

const white = '#FFFFFF';

export const DesignQuestions = () => (
  <Page
    title="Design questions"
    intro="Decisions engineers need from design before these colours can move to CAS tokens. Each question shows what the product uses today next to the CAS options."
  >
    <Question
      number={1}
      title="Secondary text"
      ask="Our secondary text (neutral900, about 230 files) and caption or placeholder text (neutral800) use neutral 600 and 400, which no CAS theme token uses. Which foreground token should each become?"
    >
      <div style={grid('repeat(4, 1fr)')}>
        {[
          ['Today: neutral900', '#566066'],
          ['foreground/secondary', themeHex('colour/foreground/secondary')],
          ['foreground/tertiary', themeHex('colour/foreground/tertiary')],
          ['foreground/quaternary', themeHex('colour/foreground/quaternary')],
          ['Today: neutral800', '#88939A'],
        ].map(([label, hex]) => (
          <TextSample key={label} foreground={hex as string} background={white}>
            <div style={mono}>{label}</div>
            The quick brown fox jumps over the lazy dog.
          </TextSample>
        ))}
      </div>
    </Question>

    <Question
      number={2}
      title="Success and info colours"
      ask="Today success uses the CRN brand green and info uses the GP2 brand blue. CAS defines success as utilitarian green and info as utilitarian blue, in both products. Should we switch? Note that the CAS pairs are below the 4.5:1 WCAG AA minimum for normal text."
    >
      <div style={grid('repeat(2, 1fr)')}>
        {[
          ['Success today (CRN green)', '#287953', '#E2EEED'],
          [
            'Success in CAS',
            themeHex('colour/foreground/success'),
            themeHex('colour/background/success'),
          ],
          ['Info today (GP2 blue)', '#006A92', '#E6F3F9'],
          [
            'Info in CAS',
            themeHex('colour/foreground/info'),
            themeHex('colour/background/info'),
          ],
        ].map(([label, fg, bg]) => (
          <TextSample
            key={label}
            foreground={fg as string}
            background={bg as string}
          >
            <b>{label}</b>
            <div>Your changes were saved.</div>
          </TextSample>
        ))}
      </div>
    </Question>

    <Question
      number={3}
      title="Colours that are not in CAS"
      ask="The avatar placeholders and a few accents use colours with no CAS equivalent (cerulean, space, azure, magenta, berry, lilac, iris, mauve, lavender). Which CAS colours should replace them? Note that CAS color-brand uses the ARIA green."
    >
      <p style={muted}>Avatar placeholder pairs today:</p>
      <div style={grid('repeat(6, 1fr)')}>
        {[
          ['success100 / crn 800', '#287953', legacyHex('success100')],
          [
            'warning100 / warning500',
            legacyHex('warning500'),
            legacyHex('warning100'),
          ],
          ['info100 / info900', legacyHex('info900'), legacyHex('info100')],
          ['azure / space', legacyHex('space'), legacyHex('azure')],
          ['lilac / berry', legacyHex('berry'), legacyHex('lilac')],
          ['lavender / mauve', legacyHex('mauve'), legacyHex('lavender')],
        ].map(([label, fg, bg]) => (
          <TextSample
            key={label}
            foreground={fg as string}
            background={bg as string}
          >
            <div style={{ fontSize: '20px', fontWeight: 700 }}>AB</div>
            <div style={{ ...mono, fontSize: '10px' }}>{label}</div>
          </TextSample>
        ))}
      </div>
      <p style={muted}>CAS colour pairs available:</p>
      <div style={grid('repeat(5, 1fr)')}>
        {['yellow', 'brand', 'green', 'lavender', 'blue'].map((name) => (
          <TextSample
            key={name}
            foreground={themeHex(`colour/foreground/color-${name}`)}
            background={themeHex(`colour/background/color-${name}`)}
          >
            <div style={{ fontSize: '20px', fontWeight: 700 }}>AB</div>
            <div style={{ ...mono, fontSize: '10px' }}>color-{name}</div>
          </TextSample>
        ))}
      </div>
      <p style={muted}>Other accents today:</p>
      <div style={{ display: 'flex', gap: '12px' }}>
        {['cerulean', 'magenta', 'iris'].map((name) => (
          <span
            key={name}
            style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}
          >
            <Swatch background={legacyHex(name)} size={24} />
            {code(name)}
          </span>
        ))}
      </div>
    </Question>

    <Question
      number={4}
      title="Error text on the error background"
      ask="CAS pairs foreground/error with background/error at 4.01:1, below the 4.5:1 WCAG AA minimum for normal text (used by error toasts and pills). Keep it, or use a darker red for text?"
    >
      <div style={grid('repeat(2, 1fr)')}>
        <TextSample
          foreground={themeHex('colour/foreground/error')}
          background={themeHex('colour/background/error')}
        >
          <b>CAS today:</b> foreground/error on background/error
        </TextSample>
        <TextSample
          foreground="#B42318"
          background={themeHex('colour/background/error')}
        >
          <b>Option:</b> red 700 on background/error
        </TextSample>
      </div>
    </Question>

    <Question
      number={5}
      title="Disabled state"
      ask="CAS now makes disabled controls neutral 300 text on a neutral 100 background with a neutral 500 border. It is much lighter than today. WCAG does not require contrast for disabled controls, but is this the intended look?"
    >
      <div style={grid('repeat(2, 1fr)')}>
        {[
          ['Disabled today', '#566066', '#EEF3F6', '#E3E6E8'],
          [
            'Disabled in CAS',
            themeHex('colour/foreground/disabled'),
            themeHex('colour/background/disabled'),
            themeHex('colour/border/disabled'),
          ],
        ].map(([label, fg, bg, border]) => (
          <div key={label}>
            <div style={muted}>{label}</div>
            <span
              style={{
                display: 'inline-block',
                padding: '8px 16px',
                borderRadius: '4px',
                color: fg,
                background: bg,
                border: `1px solid ${border}`,
                fontWeight: 500,
              }}
            >
              Save
            </span>{' '}
            <ContrastBadge
              foreground={fg as string}
              background={bg as string}
            />
          </div>
        ))}
      </div>
    </Question>

    <Question
      number={6}
      title="Brand-coloured text, links and primary buttons"
      ask="Brand-coloured text and links, and white text on the primary button, stay below 4.5:1 (the WCAG AA minimum for normal text), today and with the CAS tokens. Is that acceptable, or should text use a darker brand step?"
    >
      <div style={grid('repeat(3, 1fr)')}>
        {[
          ['CRN link today (crn 500)', '#34A270'],
          ['CRN foreground/brand', themeHex('colour/foreground/brand', 'crn')],
          ['GP2 foreground/brand', themeHex('colour/foreground/brand', 'gp2')],
        ].map(([label, hex]) => (
          <TextSample key={label} foreground={hex as string} background={white}>
            <div style={mono}>{label}</div>
            <u>Read the full guidelines</u>
          </TextSample>
        ))}
      </div>
      <div style={{ ...grid('repeat(2, 1fr)'), marginTop: '12px' }}>
        {(['crn', 'gp2'] as const).map((product) => (
          <TextSample
            key={product}
            foreground={themeHex(
              'colour/foreground/button/primary/default',
              product,
            )}
            background={themeHex(
              'colour/background/button/primary/default',
              product,
            )}
          >
            <b>{product.toUpperCase()} primary button</b>
          </TextSample>
        ))}
      </div>
    </Question>
  </Page>
);
