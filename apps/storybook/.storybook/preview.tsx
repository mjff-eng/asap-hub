import {
  CasBreakpoint,
  casBreakpoints,
  GlobalStyles,
} from '@asap-hub/react-components';
import { withKnobs } from '@storybook/addon-knobs';
import { Preview } from '@storybook/react-vite';

// One viewport per CAS breakpoint, at the width of its Figma frame, which is
// inside the breakpoint's range.
const viewportSizes: Record<
  CasBreakpoint,
  { name: string; width: number; height: number }
> = {
  mobile: { name: 'Mobile', width: 393, height: 852 },
  tablet: { name: 'Tablet', width: 800, height: 1024 },
  laptop: { name: 'Laptop', width: 1280, height: 800 },
  desktopL: { name: 'Desktop Large', width: 1440, height: 1080 },
  desktopXL: { name: 'Desktop Extra Large', width: 1920, height: 1080 },
};

const breakpoints = Object.keys(casBreakpoints) as CasBreakpoint[];

const viewportOptions = Object.fromEntries(
  breakpoints.map((breakpoint, index) => {
    const { name, width, height } = viewportSizes[breakpoint];
    const next = breakpoints[index + 1];
    const range = next
      ? `${casBreakpoints[breakpoint]}–${casBreakpoints[next] - 1}px`
      : `${casBreakpoints[breakpoint]}px +`;
    return [
      breakpoint,
      {
        name: `${name} · ${width}px (${range})`,
        styles: { width: `${width}px`, height: `${height}px` },
      },
    ];
  }),
);

const preview: Preview = {
  decorators: [
    (Story, { globals, title }) => {
      const product =
        globals.product === 'crn' || globals.product === 'gp2'
          ? globals.product
          : title.startsWith('GP2')
            ? 'gp2'
            : 'crn';
      return (
        <>
          <GlobalStyles product={product} />
          <Story />
        </>
      );
    },
  ],

  globalTypes: {
    product: {
      description: 'Product whose CAS theme colours are applied',
      toolbar: {
        title: 'Product',
        icon: 'paintbrush',
        items: [
          { value: 'auto', title: 'Auto (GP2 stories use GP2)' },
          { value: 'crn', title: 'CRN' },
          { value: 'gp2', title: 'GP2' },
        ],
        dynamicTitle: true,
      },
    },
  },

  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    viewport: { options: viewportOptions },
  },

  initialGlobals: {
    product: 'auto',
    viewport: {
      value: 'laptop',
      isRotated: false,
    },
  },
};

export default preview;
