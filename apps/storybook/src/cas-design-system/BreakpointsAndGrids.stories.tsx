import {
  AnalyticsMobilePage,
  CasBreakpoint,
  casBreakpoints,
  casContentMaxWidth,
  casGrid,
  casHeader,
  mediaBelow,
  mediaFrom,
  casSidenav,
  casTextMaxWidth,
  casTileMinWidth,
  colour,
  DashboardRecommendedUsers,
  DeliverablesCard,
  FilterDropdown,
  ForgotPasswordPage,
  ManuscriptWorkspaceUnavailablePage,
  NewsCard,
  NoOutputsPage,
  NotFoundPage,
  PasswordResetEmailSentPage,
  pixels,
  ResearchOutputFormActions,
  SigninPage,
  SpeakerList,
  Toast,
  UserProfileBiography,
  UserProfilePage,
  UtilityBar,
} from '@asap-hub/react-components';
import {
  createEventResponse,
  createListUserResponse,
  createUserResponse,
} from '@asap-hub/fixtures';
import { CardTable, MainNavigation } from '@asap-hub/gp2-components';
import { MemoryRouter } from 'react-router';
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

const desktopOnlyCss = `
  ${mediaBelow.tablet} {
    .cas-desktop-only-content { display: none; }
  }
  ${mediaFrom.tablet} {
    .cas-desktop-only-message { display: none; }
  }`;

const phoneFrame = {
  width: '375px',
  maxWidth: '100%',
  height: '587px',
  boxSizing: 'border-box',
  overflow: 'hidden',
  border: `1px solid ${colour.border.secondary}`,
  borderRadius: '24px',
  background: colour.background.primary,
} as const;

export const DesktopOnlyContent = () => (
  <Page
    title="Desktop-only content"
    intro="Some areas are too dense for a phone: analytics, project milestones and the compliance area. On a phone they show a message that asks the user to open the desktop version. From the tablet breakpoint up they show the content."
  >
    <Section title="On this screen">
      <style>{desktopOnlyCss}</style>
      <p style={{ marginTop: 0 }}>
        <span className="cas-desktop-only-message">
          <Chip kind="amber">Message</Chip> This screen is narrower than{' '}
          {casBreakpoints.tablet}px, so the user sees the message.
        </span>
        <span className="cas-desktop-only-content">
          <Chip kind="green">Content</Chip> This screen is{' '}
          {casBreakpoints.tablet}px or wider, so the user sees the content.
        </span>
      </p>
      <p style={muted}>
        Resize the screen or pick a viewport to see it change.
      </p>
    </Section>
    <Section title="The message">
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '32px',
          alignItems: 'flex-start',
        }}
      >
        <div style={phoneFrame}>
          <div style={{ marginTop: 'calc(200px - 30vh)' }}>
            <AnalyticsMobilePage />
          </div>
        </div>
        <div style={{ flex: '1 1 280px' }}>
          <p style={{ marginTop: 0 }}>
            The Analytics message on a 375 × 667px phone, in the area under the
            80px header. It takes the place of the whole page content.
          </p>
          <table style={table}>
            <tbody>
              <tr>
                <td style={cell}>Icon</td>
                <td style={cell}>Desktop screen, centred</td>
              </tr>
              <tr>
                <td style={cell}>Title</td>
                <td style={cell}>
                  [Area] are only available on the desktop version.
                </td>
              </tr>
              <tr>
                <td style={cell}>Text</td>
                <td style={cell}>
                  To access all [area] features, please use the desktop version.
                  We apologize for any inconvenience this may cause.
                </td>
              </tr>
              <tr>
                <td style={cell}>Actions</td>
                <td style={cell}>None</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Section>
    <Section title="Where it is used">
      <table style={table}>
        <thead>
          <tr>
            <th style={headCell}>Area</th>
            <th style={headCell}>Title of the message</th>
            <th style={headCell}>What it replaces</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={cell}>Analytics</td>
            <td style={cell}>
              Analytics are only available on the desktop version.
            </td>
            <td style={cell}>The whole page, with its header and tabs</td>
          </tr>
          <tr>
            <td style={cell}>Project milestones</td>
            <td style={cell}>
              Milestones are only available on the desktop version.
            </td>
            <td style={cell}>The milestones table</td>
          </tr>
          <tr>
            <td style={cell}>Project workspace</td>
            <td style={cell}>
              Compliance area is only available on the desktop version.
            </td>
            <td style={cell}>The compliance card; the message is in a card</td>
          </tr>
        </tbody>
      </table>
    </Section>
    <Section title="Before and after">
      <table style={table}>
        <thead>
          <tr>
            <th style={headCell} />
            <th style={headCell}>Before</th>
            <th style={headCell}>After</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={cell}>Message shown</td>
            <td style={cell}>Screens up to 666px wide</td>
            <td style={cell}>
              Screens up to {casBreakpoints.tablet - 1}px wide: the Mobile
              breakpoint
            </td>
          </tr>
          <tr>
            <td style={cell}>Content shown</td>
            <td style={cell}>Screens from 668px wide</td>
            <td style={cell}>
              Screens from {casBreakpoints.tablet}px wide: Tablet and up
            </td>
          </tr>
          <tr>
            <td style={cell}>Screens exactly 667px wide</td>
            <td style={cell}>
              <Chip kind="red">blank page</Chip> neither the message nor the
              content
            </td>
            <td style={cell}>
              <Chip kind="green">content</Chip>
            </td>
          </tr>
          <tr>
            <td style={cell}>
              Screens {casBreakpoints.tablet}px to 666px wide
            </td>
            <td style={cell}>
              The page uses the Tablet grid but shows the message
            </td>
            <td style={cell}>
              The page uses the Tablet grid and shows the content
            </td>
          </tr>
          <tr>
            <td style={cell}>Larger browser font size</td>
            <td style={cell}>The change stays at the same screen width</td>
            <td style={cell}>
              The change moves with the font size, like the page grid
            </td>
          </tr>
        </tbody>
      </table>
      <p style={muted}>
        667px was the height of a phone screen, used as a width. It did not
        match any breakpoint of the page grid.
      </p>
    </Section>
    <Section title="For developers">
      <p style={{ marginTop: 0 }}>
        The page renders both versions. Hide the content with{' '}
        <span style={mono}>mediaBelow.tablet</span> and the message with{' '}
        <span style={mono}>mediaFrom.tablet</span>, as in{' '}
        <span style={mono}>AnalyticsPage</span>,{' '}
        <span style={mono}>ProjectDetailMilestones</span> and{' '}
        <span style={mono}>ProjectProfileWorkspace</span>.
      </p>
    </Section>
  </Page>
);
DesktopOnlyContent.storyName = 'Desktop-only content';

const steppedSpacingCss = `
  ${mediaBelow.laptop} {
    .cas-stepped-laptop { display: none; }
  }
  ${mediaFrom.laptop} {
    .cas-stepped-below-laptop { display: none; }
  }
  ${mediaBelow.tablet} {
    .cas-stepped-tablet { display: none; }
  }
  ${mediaFrom.tablet} {
    .cas-stepped-below-tablet { display: none; }
  }`;

const noop = () => undefined;

const recommendedUsers = createListUserResponse(3).items.map((user) => ({
  ...user,
  _tags: ['Genetics', 'Proteomics', 'Imaging'],
}));

const formActions = (showSaveDraftButton: boolean) => (
  <div
    style={{
      fontSize: '16px',
      height: showSaveDraftButton ? '266px' : '188px',
      overflow: 'hidden',
      border: `1px solid ${colour.border.secondary}`,
      borderRadius: '8px',
      padding: '16px',
      boxSizing: 'border-box',
    }}
  >
    <ResearchOutputFormActions
      isSaving={false}
      savingAction={null}
      published={false}
      showSaveDraftButton={showSaveDraftButton}
      showPublishButton
      onCancel={noop}
      onSaveDraft={noop}
      onPublish={noop}
    />
  </div>
);

const profileUser = createUserResponse();

const speakersEvent = createEventResponse({ numberOfSpeakers: 3 });

const breakpointTable = (
  rows: {
    what: string;
    small: string;
    large: string;
    old: string;
    breakpoint: CasBreakpoint;
  }[],
) => (
  <table style={{ ...table, marginTop: '16px' }}>
    <thead>
      <tr>
        <th style={headCell}>What changes</th>
        <th style={headCell}>Smaller screens</th>
        <th style={headCell}>Larger screens</th>
        <th style={headCell}>Old breakpoint</th>
        <th style={headCell}>New breakpoint</th>
      </tr>
    </thead>
    <tbody>
      {rows.map(({ what, small, large, old, breakpoint }) => (
        <tr key={what}>
          <td style={cell}>{what}</td>
          <td style={cell}>{small}</td>
          <td style={cell}>{large}</td>
          <td style={cell}>{old}</td>
          <td style={cell}>
            {breakpointNames[breakpoint]}, {casBreakpoints[breakpoint]}px
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

const tabletState = (below: string, from: string) => (
  <p style={{ marginTop: 0 }}>
    <span className="cas-stepped-below-tablet">
      <Chip kind="amber">Below Tablet</Chip> This screen is narrower than{' '}
      {casBreakpoints.tablet}px. {below}
    </span>
    <span className="cas-stepped-tablet">
      <Chip kind="green">Tablet and up</Chip> This screen is{' '}
      {casBreakpoints.tablet}px or wider. {from}
    </span>
  </p>
);

export const BreakpointChanges = () => (
  <Page
    title="What changed at each breakpoint"
    intro="The components whose layout or spacing changed the most when the breakpoints moved to the CAS Design System. Each one is shown live, with the screen width where it used to change and where it changes now."
  >
    <Section title="The utility bar on this screen">
      <style>{steppedSpacingCss}</style>
      <p style={{ marginTop: 0 }}>
        <span className="cas-stepped-below-laptop">
          <Chip kind="amber">Below Laptop</Chip> This screen is narrower than{' '}
          {casBreakpoints.laptop}px. The utility bar has 24px of side padding
          and its content is on the left.
        </span>
        <span className="cas-stepped-laptop">
          <Chip kind="green">Laptop and up</Chip> This screen is{' '}
          {casBreakpoints.laptop}px or wider. The utility bar has 36px of side
          padding and its content is on the right.
        </span>
      </p>
      <div
        style={{
          border: `1px solid ${colour.border.secondary}`,
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <UtilityBar />
      </div>
      <p style={muted}>
        This is the bar above the sign in and welcome pages. Resize the screen
        or pick a viewport to see it change.
      </p>
      <table style={{ ...table, marginTop: '16px' }}>
        <thead>
          <tr>
            <th style={headCell}>What changes</th>
            <th style={headCell}>Smaller screens</th>
            <th style={headCell}>Larger screens</th>
            <th style={headCell}>Old breakpoint</th>
            <th style={headCell}>New breakpoint</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={cell}>Side padding</td>
            <td style={cell}>24px</td>
            <td style={cell}>36px</td>
            <td style={cell}>None: grew from 375px to 1080px</td>
            <td style={cell}>
              {breakpointNames.laptop}, {casBreakpoints.laptop}px
            </td>
          </tr>
          <tr>
            <td style={cell}>Alignment</td>
            <td style={cell}>Left</td>
            <td style={cell}>Right</td>
            <td style={cell}>1080px</td>
            <td style={cell}>
              {breakpointNames.laptop}, {casBreakpoints.laptop}px
            </td>
          </tr>
        </tbody>
      </table>
    </Section>
    <Section title="The filter dropdown on this screen">
      <p style={{ marginTop: 0 }}>
        <span className="cas-stepped-below-tablet">
          <Chip kind="amber">Below Tablet</Chip> This screen is narrower than{' '}
          {casBreakpoints.tablet}px. The button shows only the icon and the
          panel has 6px of padding at the bottom.
        </span>
        <span className="cas-stepped-tablet">
          <Chip kind="green">Tablet and up</Chip> This screen is{' '}
          {casBreakpoints.tablet}px or wider. The button shows the icon and the
          word Filters, and the panel has 12px of padding at the bottom.
        </span>
      </p>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          height: '240px',
          fontSize: '16px',
        }}
      >
        <div>
          <FilterDropdown menuShown onToggle={noop} onClose={noop}>
            <div style={{ padding: '6px 0', fontWeight: 'bold' }}>Type</div>
            <div style={{ padding: '6px 0' }}>Article</div>
            <div style={{ padding: '6px 0' }}>Dataset</div>
            <div style={{ padding: '6px 0' }}>Protocol</div>
          </FilterDropdown>
        </div>
      </div>
      <p style={muted}>
        This is the filter button next to the search field on the list pages,
        shown here with its panel open. The options are placeholders.
      </p>
      <table style={{ ...table, marginTop: '16px' }}>
        <thead>
          <tr>
            <th style={headCell}>What changes</th>
            <th style={headCell}>Smaller screens</th>
            <th style={headCell}>Larger screens</th>
            <th style={headCell}>Old breakpoint</th>
            <th style={headCell}>New breakpoint</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={cell}>Text of the button</td>
            <td style={cell}>Icon only</td>
            <td style={cell}>Icon and Filters</td>
            <td style={cell}>576px</td>
            <td style={cell}>
              {breakpointNames.tablet}, {casBreakpoints.tablet}px
            </td>
          </tr>
          <tr>
            <td style={cell}>Padding at the bottom of the panel</td>
            <td style={cell}>6px</td>
            <td style={cell}>12px</td>
            <td style={cell}>None: grew from 375px to 1080px</td>
            <td style={cell}>
              {breakpointNames.tablet}, {casBreakpoints.tablet}px
            </td>
          </tr>
        </tbody>
      </table>
    </Section>
    <Section title="The recommended users on this screen">
      <p style={{ marginTop: 0 }}>
        <span className="cas-stepped-below-tablet">
          <Chip kind="amber">Below Tablet</Chip> This screen is narrower than{' '}
          {casBreakpoints.tablet}px. The cards are in one column.
        </span>
        <span className="cas-stepped-tablet">
          <Chip kind="green">Tablet and up</Chip> This screen is{' '}
          {casBreakpoints.tablet}px or wider. The cards are in three columns.
        </span>
      </p>
      <div style={{ fontSize: '16px' }}>
        <DashboardRecommendedUsers recommendedUsers={recommendedUsers} />
      </div>
      <p style={muted}>
        These are the recommended users on the dashboard, with placeholder
        people. Of the components in this page it is the one whose breakpoint
        moved the most: 127px.
      </p>
      <table style={{ ...table, marginTop: '16px' }}>
        <thead>
          <tr>
            <th style={headCell}>What changes</th>
            <th style={headCell}>Smaller screens</th>
            <th style={headCell}>Larger screens</th>
            <th style={headCell}>Old breakpoint</th>
            <th style={headCell}>New breakpoint</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={cell}>Layout of the cards</td>
            <td style={cell}>One column</td>
            <td style={cell}>Three columns</td>
            <td style={cell}>768px</td>
            <td style={cell}>
              {breakpointNames.tablet}, {casBreakpoints.tablet}px
            </td>
          </tr>
        </tbody>
      </table>
    </Section>
    <Section title="The news card on this screen">
      {tabletState(
        'The card has no image.',
        'The card has the image on the left.',
      )}
      <div style={{ fontSize: '16px' }}>
        <NewsCard
          id="news"
          created="2026-01-15T12:00:00.000Z"
          type="News"
          title="Coordinating different research interests"
          shortText="A point of view on how the teams of the network plan their work together."
          tags={['Genetics', 'Proteomics', 'Imaging']}
        />
      </div>
      <p style={muted}>
        The card of the News page, with placeholder content. The tutorial card
        changes the same way.
      </p>
      {breakpointTable([
        {
          what: 'Image of the card',
          small: 'Hidden',
          large: 'Shown',
          old: '768px',
          breakpoint: 'tablet',
        },
      ])}
    </Section>
    <Section title="The speaker list on this screen">
      {tabletState(
        'Each speaker is a block, with a label before each value.',
        'The speakers are a table with three columns.',
      )}
      <div style={{ fontSize: '16px' }}>
        <SpeakerList
          speakers={speakersEvent.speakers}
          endDate={speakersEvent.endDate}
        />
      </div>
      <p style={muted}>
        The speakers of an event page, with placeholder people.
      </p>
      {breakpointTable([
        {
          what: 'Layout of the speakers',
          small: 'Blocks with labels',
          large: 'Table with three columns',
          old: '767px',
          breakpoint: 'tablet',
        },
      ])}
    </Section>
    <Section title="GP2 on this screen">
      {tabletState(
        'The table is a list of blocks, with a label before each value.',
        'The table has its columns and a row of headings.',
      )}
      <div style={{ fontSize: '16px' }}>
        <CardTable headings={['Name', 'Role', 'Status']}>
          {[
            { id: 'one', values: ['Person A', 'Lead', 'Active'] },
            { id: 'two', values: ['Person B', 'Contributor', 'Completed'] },
            { id: 'three', values: ['Person C', 'Investigator', 'Paused'] },
          ]}
        </CardTable>
      </div>
      <p style={muted}>
        The table of projects and working groups in a GP2 user profile, with
        placeholder rows. All GP2 components that had a mobile layout changed at
        768px and now change at Tablet: cards, tables, headers, forms and
        modals.
      </p>
      {breakpointTable([
        {
          what: 'Mobile and desktop layouts of GP2',
          small: 'Mobile layout',
          large: 'Desktop layout',
          old: '768px',
          breakpoint: 'tablet',
        },
      ])}
    </Section>
    <Section title="The page not found message on this screen">
      {tabletState(
        'The message has 36px of padding above and below, its text runs on, and the button is as wide as the page.',
        'The message has 72px of padding above and below, its text breaks after the first sentence, and the button is as wide as its label.',
      )}
      <div
        style={{
          border: `1px solid ${colour.border.secondary}`,
          borderRadius: '8px',
          fontSize: '16px',
        }}
      >
        <MemoryRouter>
          <NotFoundPage />
        </MemoryRouter>
      </div>
      <p style={muted}>
        The page shown for an address that does not exist. Its three changes
        happened at three different screen widths, and now happen together.
      </p>
      {breakpointTable([
        {
          what: 'Padding above and below',
          small: '36px',
          large: '72px',
          old: 'None: grew from 375px to 1080px',
          breakpoint: 'tablet',
        },
        {
          what: 'Line break after the first sentence',
          small: 'No',
          large: 'Yes',
          old: '576px',
          breakpoint: 'tablet',
        },
        {
          what: 'Content centred in the page',
          small: 'No',
          large: 'Yes',
          old: '376px',
          breakpoint: 'tablet',
        },
      ])}
    </Section>
    <Section title="The no outputs message on this screen">
      {tabletState(
        'The button is as wide as the page.',
        'The button is as wide as its label, centred in the page.',
      )}
      <div
        style={{
          border: `1px solid ${colour.border.secondary}`,
          borderRadius: '8px',
          padding: '32px 0',
          fontSize: '16px',
        }}
      >
        <MemoryRouter>
          <NoOutputsPage
            title="You haven’t shared any research."
            description="To add research to your profile, contact your PM. In the meantime, try exploring research outputs shared by the network."
          />
        </MemoryRouter>
      </div>
      <p style={muted}>
        The message in the outputs tab of your own profile, when you have no
        outputs. Working groups and projects show it without the button. Nothing
        changes for the user here: the rule that centred the content from 376px
        had no visible effect below {casBreakpoints.tablet}px, where the button
        is always as wide as the page.
      </p>
      {breakpointTable([
        {
          what: 'Content centred in the page',
          small: 'No',
          large: 'Yes',
          old: '376px',
          breakpoint: 'tablet',
        },
      ])}
    </Section>
    <Section title="The manuscript not available message on this screen">
      {tabletState(
        'The message has 36px of padding above and below, and the button is as wide as the message.',
        'The message has 72px of padding above and below, and the button is as wide as its label.',
      )}
      <div
        style={{
          border: `1px solid ${colour.border.secondary}`,
          borderRadius: '8px',
          fontSize: '16px',
        }}
      >
        <MemoryRouter>
          <ManuscriptWorkspaceUnavailablePage />
        </MemoryRouter>
      </div>
      <p style={muted}>
        The page shown when a user opens a manuscript of a project they are not
        part of. Only the padding changes for the user: the rule that centred
        the content from 376px had no visible effect below{' '}
        {casBreakpoints.tablet}px, where the button is always as wide as the
        message.
      </p>
      {breakpointTable([
        {
          what: 'Padding above and below',
          small: '36px',
          large: '72px',
          old: 'None: grew from 375px to 1080px',
          breakpoint: 'tablet',
        },
        {
          what: 'Content centred in the page',
          small: 'No',
          large: 'Yes',
          old: '376px',
          breakpoint: 'tablet',
        },
      ])}
    </Section>
    <Section title="The biography card on this screen">
      {tabletState(
        'The View Biosketch button is as wide as the card.',
        'The View Biosketch button is at most 354px wide, on the left.',
      )}
      <div style={{ fontSize: '16px' }}>
        <MemoryRouter>
          <UserProfileBiography
            biography="Person A studies how proteins move inside cells, and leads a lab that develops imaging methods for it."
            biosketch="https://example.com/biosketch"
          />
        </MemoryRouter>
      </div>
      <p style={muted}>
        The biography card in the About tab of a user profile, with a
        placeholder biography. Nothing changes for the user here: the rule that
        stretched the button up to 375px had no visible effect, because below{' '}
        {casBreakpoints.tablet}px the button is always as wide as the card.
      </p>
      {breakpointTable([
        {
          what: 'Button stretched to the width of the card',
          small: 'Yes',
          large: 'No',
          old: '375px',
          breakpoint: 'tablet',
        },
      ])}
    </Section>
    <Section title="The output form buttons on this screen">
      {tabletState(
        'With two buttons, they are stacked and as wide as the form, with Publish on top.',
        'With two buttons, they are side by side on the right.',
      )}
      {formActions(false)}
      <p>
        <span className="cas-stepped-below-laptop">
          <Chip kind="amber">Below Laptop</Chip> This screen is narrower than{' '}
          {casBreakpoints.laptop}px. With three buttons, they are stacked and as
          wide as the form, with Publish on top.
        </span>
        <span className="cas-stepped-laptop">
          <Chip kind="green">Laptop and up</Chip> This screen is{' '}
          {casBreakpoints.laptop}px or wider. With three buttons, they are side
          by side on the right.
        </span>
      </p>
      {formActions(true)}
      <p style={muted}>
        The buttons at the end of the form to share a research output. There are
        three when the user can both save a draft and publish.
      </p>
      {breakpointTable([
        {
          what: 'Two buttons',
          small: 'Stacked',
          large: 'Side by side',
          old: '375px',
          breakpoint: 'tablet',
        },
        {
          what: 'Three buttons',
          small: 'Stacked',
          large: 'Side by side',
          old: '1110px',
          breakpoint: 'laptop',
        },
      ])}
    </Section>
    <Section title="The user profile header on this screen">
      {tabletState(
        'The photo is above the name, on the left.',
        'The photo is on the right of the name.',
      )}
      <div
        style={{
          border: `1px solid ${colour.border.secondary}`,
          borderRadius: '8px',
          overflow: 'hidden',
          fontSize: '16px',
        }}
      >
        <MemoryRouter>
          <UserProfilePage {...profileUser}>{null}</UserProfilePage>
        </MemoryRouter>
      </div>
      <p style={muted}>
        The header of a user profile, with a placeholder person.
      </p>
      {breakpointTable([
        {
          what: 'Position of the photo',
          small: 'Above the name',
          large: 'Right of the name',
          old: '620px',
          breakpoint: 'tablet',
        },
        {
          what: 'Space between the columns',
          small: '12px',
          large: '30px',
          old: '1025px, with 24px to 30px depending on the screen',
          breakpoint: 'laptop',
        },
      ])}
    </Section>
    <Section title="The toast on this screen">
      {tabletState(
        'The toast has 12px of padding above and below.',
        'The toast has 6px of padding above and below.',
      )}
      <div style={{ fontSize: '16px' }}>
        <Toast accent="info" rounded>
          Your changes have been saved.
        </Toast>
      </div>
      <p style={muted}>
        The message shown at the top of a page or inside a card after an action,
        here with placeholder text. It is taller on small screens.
      </p>
      {breakpointTable([
        {
          what: 'Padding above and below',
          small: '12px',
          large: '6px',
          old: 'None: shrank from 375px to 1080px',
          breakpoint: 'tablet',
        },
      ])}
    </Section>
    <Section title="The sign in page on this screen">
      {tabletState(
        'The page has 36px of padding above and below the form, and 12px between the parts of the form.',
        'The page has 72px of padding above and below the form, and 24px between the parts of the form.',
      )}
      <div
        style={{
          border: `1px solid ${colour.border.secondary}`,
          borderRadius: '8px',
          fontSize: '16px',
        }}
      >
        <MemoryRouter>
          <SigninPage
            forgotPasswordHref="#"
            appOrigin="https://hub.example.com"
            email=""
            password=""
          />
        </MemoryRouter>
      </div>
      <p style={muted}>
        The page where a user signs in with Google, ORCID or an email and
        password. The fields are empty and the buttons do nothing here.
      </p>
      {breakpointTable([
        {
          what: 'Padding above and below',
          small: '36px',
          large: '72px',
          old: 'None: grew from 375px to 1080px',
          breakpoint: 'tablet',
        },
        {
          what: 'Space between the parts of the form',
          small: '12px',
          large: '24px',
          old: 'None: grew from 375px to 1080px',
          breakpoint: 'tablet',
        },
      ])}
    </Section>
    <Section title="The forgot password page on this screen">
      {tabletState(
        'The page has 36px of padding above and below, and 12px between the text and the form.',
        'The page has 72px of padding above and below, and 24px between the text and the form.',
      )}
      <div
        style={{
          border: `1px solid ${colour.border.secondary}`,
          borderRadius: '8px',
          fontSize: '16px',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <ForgotPasswordPage email="" />
      </div>
      <p style={muted}>
        The page a user opens from Forgot Password in the sign in page. The
        field is empty and the buttons do nothing here.
      </p>
      {breakpointTable([
        {
          what: 'Padding above and below',
          small: '36px',
          large: '72px',
          old: 'None: grew from 375px to 1080px',
          breakpoint: 'tablet',
        },
        {
          what: 'Space between the text and the form',
          small: '12px',
          large: '24px',
          old: 'None: grew from 375px to 1080px',
          breakpoint: 'tablet',
        },
      ])}
    </Section>
    <Section title="The reset email sent page on this screen">
      <p style={{ marginTop: 0 }}>
        <span className="cas-stepped-below-laptop">
          <Chip kind="amber">Below Laptop</Chip> This screen is narrower than{' '}
          {casBreakpoints.laptop}px. The card is at most 384px wide.
        </span>
        <span className="cas-stepped-laptop">
          <Chip kind="green">Laptop and up</Chip> This screen is{' '}
          {casBreakpoints.laptop}px or wider. The card is 415px wide.
        </span>
      </p>
      <div
        style={{
          border: `1px solid ${colour.border.secondary}`,
          borderRadius: '8px',
          fontSize: '16px',
          display: 'flex',
        }}
      >
        <MemoryRouter>
          <PasswordResetEmailSentPage signInHref="#" />
        </MemoryRouter>
      </div>
      <p style={muted}>
        The page shown after a user asks for a password reset link.
      </p>
      {breakpointTable([
        {
          what: 'Width of the card',
          small: '384px at most',
          large: '415px',
          old: 'None: grew from 576px to 1080px',
          breakpoint: 'laptop',
        },
      ])}
    </Section>
    <Section title="The GP2 menu on this screen">
      <p style={{ marginTop: 0 }}>
        <span className="cas-stepped-below-laptop">
          <Chip kind="amber">Below Laptop</Chip> This screen is narrower than{' '}
          {casBreakpoints.laptop}px. The menu is a panel that opens from the
          header button. Its list has 16px of padding on every side.
        </span>
        <span className="cas-stepped-laptop">
          <Chip kind="green">Laptop and up</Chip> This screen is{' '}
          {casBreakpoints.laptop}px or wider. The menu is a row of links in the
          header, which did not change.
        </span>
      </p>
      <div
        style={{
          border: `1px solid ${colour.border.secondary}`,
          borderRadius: '8px',
          fontSize: '16px',
          overflowX: 'auto',
        }}
      >
        <MemoryRouter>
          <MainNavigation />
        </MemoryRouter>
      </div>
      <p style={muted}>
        The main links of GP2. Below Laptop the padding of the list was set by a
        formula based on the old screens, and is now fixed. The panel no longer
        has a minimum width of its own: it takes the width the page layout gives
        it. The links go nowhere here.
      </p>
      <table style={{ ...table, marginTop: '16px' }}>
        <thead>
          <tr>
            <th style={headCell}>What changed</th>
            <th style={headCell}>Before</th>
            <th style={headCell}>Now</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={cell}>Padding above the first link</td>
            <td style={cell}>
              About 21px, set by a formula based on the old 375px and 1080px
              screens
            </td>
            <td style={cell}>16px</td>
          </tr>
          <tr>
            <td style={cell}>Padding at the sides and below the last link</td>
            <td style={cell}>12px</td>
            <td style={cell}>16px</td>
          </tr>
          <tr>
            <td style={cell}>Minimum width of the panel</td>
            <td style={cell}>
              312px at 375px, shrinking to 228px at 768px and growing to 258px
              at 1080px
            </td>
            <td style={cell}>None</td>
          </tr>
        </tbody>
      </table>
    </Section>
    <Section title="Card padding on every screen">
      <p style={{ marginTop: 0 }}>
        <Chip kind="green">Every screen</Chip> The content of these cards has
        24px of padding on every side. It no longer changes with the screen.
      </p>
      <div style={{ fontSize: '16px' }}>
        <DeliverablesCard
          deliverables={[
            { description: 'Publish the shared protocol', status: 'Complete' },
            {
              description: 'Collect samples from every site',
              status: 'In Progress',
            },
          ]}
        />
      </div>
      <p style={muted}>
        The deliverables card of a working group, with placeholder text. The
        same padding is used by the banner card, the toast card, the items of
        the shared research and project output lists, the manuscript version and
        compliance report cards, and the confirm, status change, APC coverage
        and assign users modals.
      </p>
      <table style={{ ...table, marginTop: '16px' }}>
        <thead>
          <tr>
            <th style={headCell}>What changed</th>
            <th style={headCell}>Before</th>
            <th style={headCell}>Now</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={cell}>Padding above and below</td>
            <td style={cell}>18px to 24px, growing from 375px to 576px</td>
            <td style={cell}>24px</td>
          </tr>
          <tr>
            <td style={cell}>Side padding</td>
            <td style={cell}>24px to 36px, growing from 375px to 1080px</td>
            <td style={cell}>24px</td>
          </tr>
        </tbody>
      </table>
    </Section>
    <Section title="For developers">
      <p style={{ marginTop: 0 }}>
        Change a layout with <span style={mono}>mediaFrom</span> and{' '}
        <span style={mono}>mediaBelow</span>, which use the breakpoints of the
        page grid. For a spacing with two values, set the smaller one as the
        base style and the larger one in{' '}
        <span style={mono}>mediaFrom.tablet</span> or{' '}
        <span style={mono}>mediaFrom.laptop</span>. The helpers that scaled a
        value with every pixel of the screen were removed.
      </p>
    </Section>
  </Page>
);
BreakpointChanges.storyName = 'What changed at each breakpoint';
