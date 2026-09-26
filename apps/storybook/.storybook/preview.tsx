import { GlobalStyles, pixels } from '@asap-hub/react-components';
import { withKnobs } from '@storybook/addon-knobs';
import { Preview } from '@storybook/react-vite';

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
    viewport: {
      options: {
        mobile: {
          name: 'Mobile',
          styles: {
            width: `${pixels.mobileScreen.width}px`,
            height: `${pixels.mobileScreen.height}px`,
          },
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: `${pixels.tabletScreen.width}px`,
            height: `${pixels.tabletScreen.height}px`,
          },
        },
        smallDesktop: {
          name: 'Small Desktop',
          styles: {
            width: `${pixels.smallDesktopScreen.width}px`,
            height: `${pixels.smallDesktopScreen.height}px`,
          },
        },
        largeDesktop: {
          name: 'Large Desktop',
          styles: {
            width: `${pixels.largeDesktopScreen.width}px`,
            height: `${pixels.largeDesktopScreen.height}px`,
          },
        },
      },
    },
  },

  initialGlobals: {
    product: 'auto',
    viewport: {
      value: 'smallDesktop',
      isRotated: false,
    },
  },
};

export default preview;
