import {
  CasBreakpoint,
  casBreakpoints,
  casContentMaxWidth,
  casGrid,
  casHeader,
  mediaFrom,
  casSidenav,
  casTextMaxWidth,
  casTileMinWidth,
  colour,
  pixels,
} from '@asap-hub/react-components';
import { cell, Chip, headCell, mono, muted, Page, Section, table } from './ui';

export default {
  title: 'CAS Design System / Breakpoints & Grids',
};

type Product = keyof typeof casGrid;

const productNames: Record<Product, string> = { crn: 'CRN', gp2: 'GP2' };

const breakpointNames: Record<CasBreakpoint, string> = {
  mobile: 'Mobile',
  tablet: 'Tablet',
  laptop: 'Laptop',
  desktopL: 'Desktop Large',
  desktopXL: 'Desktop Extra Large',
};

const breakpoints = Object.keys(casBreakpoints) as CasBreakpoint[];

const range = (breakpoint: CasBreakpoint) => {
  const next = breakpoints[breakpoints.indexOf(breakpoint) + 1];
  return next
    ? `${casBreakpoints[breakpoint]}px – ${casBreakpoints[next] - 1}px`
    : `${casBreakpoints[breakpoint]}px +`;
};

const GridTable = ({ product }: { product: Product }) => (
  <table style={table}>
    <thead>
      <tr>
        <th style={headCell}>Name</th>
        <th style={headCell}>Screen width</th>
        <th style={headCell}>Margin</th>
        <th style={headCell}>Max width</th>
        <th style={headCell}>Columns</th>
        <th style={headCell}>Gutter</th>
      </tr>
    </thead>
    <tbody>
      {breakpoints.map((breakpoint) => {
        const { margin, maxWidth, columns, columnWidth, gutter } =
          casGrid[product][breakpoint];
        return (
          <tr key={breakpoint}>
            <td style={cell}>
              {breakpointNames[breakpoint]}
              <div style={{ ...mono, ...muted }}>{breakpoint}</div>
            </td>
            <td style={{ ...cell, ...mono }}>{range(breakpoint)}</td>
            <td style={{ ...cell, ...mono }}>{margin}px</td>
            <td style={{ ...cell, ...mono }}>
              {maxWidth === null ? (
                <Chip kind="grey">fills the screen</Chip>
              ) : (
                `${maxWidth}px`
              )}
            </td>
            <td style={{ ...cell, ...mono }}>
              {columns} × {columnWidth}px
            </td>
            <td style={{ ...cell, ...mono }}>{gutter}px</td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

export const Breakpoints = () => (
  <Page
    title="Breakpoints & Grids"
    intro="The page grid for CRN and GP2 at each screen width, from the Breakpoints & Grids frames in the CAS Design System Figma file. Figma has no variables for these yet, so the values are written by hand in react-components/src/cas-layout.ts."
  >
    <Section title="CRN">
      <GridTable product="crn" />
      <p style={muted}>
        Margins are the smallest space between the content and the edge of the
        content area. The max widths leave room for the open side navigation;
        with it closed, the content keeps its max width and is centred, so the
        space on each side grows.
      </p>
    </Section>
    <Section title="GP2">
      <GridTable product="gp2" />
      <p style={muted}>
        GP2 has a top navigation bar instead of a side navigation. From tablet
        up the content is at most 900px wide and centred: 62px each side at
        1025px, 270px at 1440px and 510px at 1920px.
      </p>
    </Section>
    <Section title="Component widths">
      <table style={table}>
        <thead>
          <tr>
            <th style={headCell}>Token</th>
            <th style={headCell}>Value</th>
            <th style={headCell}>Use</th>
            <th style={headCell}>In code</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={cell}>Container</td>
            <td style={{ ...cell, ...mono }}>the max width above</td>
            <td style={cell}>
              Detail pages, tables, dashboards, charts, tile grids, page header
              backgrounds and tab bars fill the container.
            </td>
            <td style={{ ...cell, ...mono }}>pageContainerStyles</td>
          </tr>
          <tr>
            <td style={cell}>Content</td>
            <td style={{ ...cell, ...mono }}>{casContentMaxWidth}px</td>
            <td style={cell}>
              Search and directory lists and forms are capped and centred. They
              fill the container where it is narrower.
            </td>
            <td style={{ ...cell, ...mono }}>
              pageContentContainerStyles, contentWidthStyles
            </td>
          </tr>
          <tr>
            <td style={cell}>Text</td>
            <td style={{ ...cell, ...mono }}>{casTextMaxWidth}</td>
            <td style={cell}>
              Page header descriptions and paragraphs, on every page.
            </td>
            <td style={{ ...cell, ...mono }}>pageHeaderTextStyles</td>
          </tr>
          <tr>
            <td style={cell}>Tile minimum</td>
            <td style={{ ...cell, ...mono }}>{casTileMinWidth}px</td>
            <td style={cell}>
              Tile grids: 2 columns in the 1464px container, 1 column below it.
            </td>
            <td style={{ ...cell, ...mono }}>tileGridStyles</td>
          </tr>
        </tbody>
      </table>
      <p style={muted}>
        In CRN, PageConstraints and PageInfoContainer take{' '}
        <span style={mono}>width=&quot;content&quot;</span> for the 900px cap;
        without it they fill the container.
      </p>
    </Section>
    <Section title="Font size">
      <p style={{ marginTop: 0 }}>
        The pixel values are for the browser&apos;s default font size of 16px.
        In code, breakpoints are in em and margins and max widths in rem, so
        with a larger font size setting they all grow by the same factor and the
        page moves to the layout of a narrower screen.
      </p>
    </Section>
    <Section title="Gutter">
      <p style={{ marginTop: 0 }}>
        The page container sets the gutter of the current breakpoint in the{' '}
        <span style={mono}>--page-gutter</span> custom property. Use{' '}
        <span style={mono}>pageGutter</span> from react-components for the space
        between blocks laid side by side on the page, for example{' '}
        <span style={mono}>columnGap: pageGutter</span>.
      </p>
    </Section>
    <Section title="Header">
      <p style={{ marginTop: 0 }}>
        CRN: <span style={mono}>{casHeader.crn.height}px</span> high at every
        breakpoint. GP2: <span style={mono}>{casHeader.gp2.height}px</span>{' '}
        high, with a <span style={mono}>{casHeader.gp2.accentBar}px</span>{' '}
        gradient bar under it from tablet up.
      </p>
    </Section>
    <Section title="CRN side navigation">
      <p style={{ marginTop: 0 }}>
        Shown from the laptop breakpoint ({casBreakpoints.laptop}px) up:{' '}
        <span style={mono}>{casSidenav.open}px</span> open,{' '}
        <span style={mono}>{casSidenav.closed}px</span> closed. Below that it
        opens as a drawer over the page.
      </p>
    </Section>
  </Page>
);

// The demo applies the same values as pageContainerStyles, written as plain
// CSS because Storybook has no Emotion of its own.
const { remUnit } = pixels;
const demoCss = (product: Product) =>
  breakpoints
    .map((breakpoint) => {
      const { margin, maxWidth, columns, gutter } =
        casGrid[product][breakpoint];
      const rules = `
        .cas-grid-demo { padding: 0 ${remUnit(margin)}; max-width: ${
          maxWidth === null ? 'none' : remUnit(maxWidth + margin * 2)
        }; }
        .cas-grid-demo-columns { grid-template-columns: repeat(${columns}, 1fr); gap: ${remUnit(
          gutter,
        )}; }
        .cas-grid-demo-columns > * { display: block; }
        .cas-grid-demo-columns > :nth-child(n + ${
          columns + 1
        }) { display: none; }
        .cas-grid-demo-name::after { content: '${productNames[product]} · ${
          breakpointNames[breakpoint]
        }'; }`;
      return breakpoint === 'mobile'
        ? rules
        : `${mediaFrom[breakpoint]} { ${rules} }`;
    })
    .join('\n');

const GridDemo = ({ product }: { product: Product }) => (
  <div
    style={{
      fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
      fontSize: '14px',
      color: colour.foreground.primary,
      background: colour.background.secondary,
      minHeight: '100vh',
      paddingTop: '24px',
    }}
  >
    <style>{demoCss(product)}</style>
    <div
      className="cas-grid-demo"
      style={{
        boxSizing: 'border-box',
        width: '100%',
        margin: '0 auto',
      }}
    >
      <p style={{ margin: '0 0 12px' }}>
        <span className="cas-grid-demo-name" style={{ fontWeight: 700 }} />
        <span style={muted}>
          {' '}
          · resize the screen or pick a viewport to see each breakpoint
        </span>
      </p>
      <div
        className="cas-grid-demo-columns"
        style={{ display: 'grid', height: '320px' }}
      >
        {Array.from({ length: 12 }, (_, index) => (
          <div key={index} style={{ background: colour.background.info }} />
        ))}
      </div>
    </div>
  </div>
);

export const CrnGridOnThisScreen = () => <GridDemo product="crn" />;
CrnGridOnThisScreen.storyName = 'CRN grid on this screen';

export const Gp2GridOnThisScreen = () => <GridDemo product="gp2" />;
Gp2GridOnThisScreen.storyName = 'GP2 grid on this screen';
