import { ReactNode } from 'react';
import {
  Caption,
  Display,
  Headline2,
  Headline3,
  Headline6,
  Paragraph,
  Subtitle,
  text,
} from '@asap-hub/react-components';
import {
  casFontFamily,
  casTextStyles,
  CasTextStyle,
} from '@asap-hub/react-components/cas-tokens';
import { cell, Chip, headCell, mono, muted, Page, Section, table } from './ui';

export default {
  title: 'CAS Design System / Typography',
};

const flattenStyles = (
  node: unknown,
  path: string[],
): { name: string; style: CasTextStyle }[] =>
  'fontSize' in (node as object)
    ? [{ name: path.join('/'), style: node as CasTextStyle }]
    : Object.entries(node as Record<string, unknown>).flatMap(([key, child]) =>
        flattenStyles(child, [...path, key]),
      );

const textStyles = flattenStyles(casTextStyles, []);

const loadedWeights = [400, 700];

const styleSummary = ({
  family,
  fontSize,
  lineHeight,
  fontWeight,
}: CasTextStyle) =>
  `${casFontFamily[family]} ${fontWeight} · ${fontSize} / ${lineHeight}px`;

export const TextStyles = () => (
  <Page
    title="Typography: text styles"
    intro="Every text style in the CAS Design System Figma file, generated from design's export. Sizes do not change with the screen width."
  >
    <Section title="Fonts">
      <p style={{ marginTop: 0 }}>
        CRN and GP2 use the same fonts. Headings use the heading font; body
        text, buttons and captions use the body font.
      </p>
      <table style={table}>
        <tbody>
          {Object.entries(casFontFamily).map(([name, family]) => (
            <tr key={name}>
              <td style={{ ...cell, ...mono }}>font/family/{name}</td>
              <td style={{ ...cell, fontFamily: family, fontSize: '20px' }}>
                {family}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
    <Section title="Styles">
      <table style={table}>
        <thead>
          <tr>
            <th style={headCell}>Figma style</th>
            <th style={headCell}>Font · weight · size / line height</th>
            <th style={headCell}>Sample</th>
          </tr>
        </thead>
        <tbody>
          {textStyles.map(({ name, style }) => (
            <tr key={name}>
              <td style={{ ...cell, ...mono }}>{name}</td>
              <td style={{ ...cell, ...mono }}>
                {styleSummary(style)}
                {!loadedWeights.includes(style.fontWeight) && (
                  <div>
                    <Chip kind="amber">weight not loaded</Chip>
                  </div>
                )}
              </td>
              <td
                style={{
                  ...cell,
                  fontFamily: casFontFamily[style.family],
                  fontSize: `${style.fontSize}px`,
                  lineHeight: `${style.lineHeight}px`,
                  fontWeight: style.fontWeight,
                }}
              >
                Shared Research
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={muted}>
        The apps load Roboto and Roboto Slab at weights{' '}
        {loadedWeights.join(' and ')} only, so the browser draws the other
        weights with the closest of those two.
      </p>
    </Section>
  </Page>
);

const hubComponents: {
  name: string;
  role: string;
  figmaStyle: string;
  sample: ReactNode;
}[] = [
  {
    name: 'Display',
    role: 'List page and Dashboard title',
    figmaStyle: 'heading/2/bold',
    sample: <Display>Shared Research</Display>,
  },
  {
    name: 'Headline2',
    role: 'Stat number',
    figmaStyle: 'heading/3/bold',
    sample: <Headline2>128</Headline2>,
  },
  {
    name: 'Display styleAsHeading={4}',
    role: 'Detail page title, 404, page without a design, editor drawer',
    figmaStyle: 'heading/4/bold',
    sample: <Display styleAsHeading={4}>Team Profile</Display>,
  },
  {
    name: 'Headline2 styleAsHeading={5}',
    role: 'Component header: card, event card title, dialog, form section',
    figmaStyle: 'heading/5/bold',
    sample: <Headline2 styleAsHeading={5}>Speakers</Headline2>,
  },
  {
    name: 'Headline3 styleAsHeading={6}',
    role: 'Title inside a component',
    figmaStyle: 'heading/6/bold',
    sample: <Headline3 styleAsHeading={6}>Team Name</Headline3>,
  },
  {
    name: 'Subtitle, Headline5',
    role: 'Label, column header, small title inside a card',
    figmaStyle: 'body/bold',
    sample: <Subtitle>Version #1</Subtitle>,
  },
  {
    name: 'Headline6',
    role: 'Smallest heading in Contentful text',
    figmaStyle: 'body/regular',
    sample: <Headline6>Shared Research</Headline6>,
  },
  {
    name: 'Paragraph',
    role: 'Body text',
    figmaStyle: 'body/regular',
    sample: <Paragraph>Shared Research</Paragraph>,
  },
  {
    name: 'Caption',
    role: 'Caption',
    figmaStyle: 'caption/regular',
    sample: <Caption>Shared Research</Caption>,
  },
  {
    name: 'Caption bold',
    role: 'Caption',
    figmaStyle: 'caption/bold',
    sample: <Caption bold>Shared Research</Caption>,
  },
];

export const HubComponents = () => (
  <Page
    title="Typography: Hub components"
    intro="The text components in react-components and the Figma style each role uses. Headings take the style of their role on the page, the same in CRN and GP2 (agreed with design on 23 Oct 2026)."
  >
    <Section title="Components">
      <table style={table}>
        <thead>
          <tr>
            <th style={headCell}>Component</th>
            <th style={headCell}>Role</th>
            <th style={headCell}>Figma style</th>
            <th style={headCell}>Sample</th>
          </tr>
        </thead>
        <tbody>
          {hubComponents.map(({ name, role, figmaStyle, sample }) => {
            const style = textStyles.find(
              (textStyle) => textStyle.name === figmaStyle,
            )?.style;
            return (
              <tr key={name}>
                <td style={{ ...cell, ...mono }}>{name}</td>
                <td style={cell}>{role}</td>
                <td style={{ ...cell, ...mono }}>
                  {figmaStyle}
                  {style && <div style={muted}>{styleSummary(style)}</div>}
                </td>
                {/* Paragraph and Caption size in em, so they need the app's base font around them, not the page's 14px */}
                <td style={{ ...cell, ...text.fontStyles }}>{sample}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Section>
  </Page>
);
