import { ReactNode } from 'react';
import {
  Caption,
  Display,
  Headline2,
  Headline3,
  Headline4,
  Headline6,
  Paragraph,
  Subtitle,
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
  figmaStyle?: string;
  sample: ReactNode;
}[] = [
  {
    name: 'Display',
    figmaStyle: 'heading/2/bold',
    sample: <Display>Shared Research</Display>,
  },
  {
    name: 'Headline2',
    figmaStyle: 'heading/3/bold',
    sample: <Headline2>Shared Research</Headline2>,
  },
  {
    name: 'Headline3',
    figmaStyle: 'heading/4/bold',
    sample: <Headline3>Shared Research</Headline3>,
  },
  {
    name: 'Headline4',
    figmaStyle: 'heading/6/bold',
    sample: <Headline4>Shared Research</Headline4>,
  },
  {
    name: 'Headline5, Subtitle',
    figmaStyle: 'body/bold',
    sample: <Subtitle>Shared Research</Subtitle>,
  },
  {
    name: 'Headline6',
    figmaStyle: 'body/regular',
    sample: <Headline6>Shared Research</Headline6>,
  },
  {
    name: 'Paragraph',
    figmaStyle: 'body/regular',
    sample: <Paragraph>Shared Research</Paragraph>,
  },
  {
    name: 'Caption',
    sample: <Caption>Shared Research</Caption>,
  },
];

export const HubComponents = () => (
  <Page
    title="Typography: Hub components"
    intro="The text components in react-components and the Figma style each one uses. Each heading level takes the style closest to its size before CAS (agreed with design on 22 Oct 2026)."
  >
    <Section title="Components">
      <table style={table}>
        <thead>
          <tr>
            <th style={headCell}>Component</th>
            <th style={headCell}>Figma style</th>
            <th style={headCell}>Sample</th>
          </tr>
        </thead>
        <tbody>
          {hubComponents.map(({ name, figmaStyle, sample }) => {
            const style = textStyles.find(
              (textStyle) => textStyle.name === figmaStyle,
            )?.style;
            return (
              <tr key={name}>
                <td style={{ ...cell, ...mono }}>{name}</td>
                <td style={{ ...cell, ...mono }}>
                  {figmaStyle && style ? (
                    <>
                      {figmaStyle}
                      <div style={muted}>{styleSummary(style)}</div>
                    </>
                  ) : (
                    <Chip kind="amber">waiting on design</Chip>
                  )}
                </td>
                <td style={cell}>{sample}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Section>
  </Page>
);
