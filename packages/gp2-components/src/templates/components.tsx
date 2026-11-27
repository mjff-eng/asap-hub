import {
  pageContainerStyles,
  pageMarginStyles,
  pageContentContainerStyles,
  pixels,
} from '@asap-hub/react-components';
import { layoutContentStyles } from '../layout';

const { rem } = pixels;

const components = {
  NavigationLink: {
    styles: {
      svg: {
        fill: 'currentColor',
      },
    },
  },
  Accordion: {
    containerStyles: {
      padding: 0,
    },
    itemStyles: {
      margin: 0,
    },
  },
  Pill: {
    styles: {
      fontSize: rem(14),
      padding: '4px 8px',
      lineHeight: rem(16),
      maxWidth: 'fit-content',
    },
  },
  TabLink: {
    styles: {},
    layoutStyles: {},
  },
  ExternalLink: {
    styles: {
      margin: 0,
    },
  },
  EventPage: {
    containerStyles: layoutContentStyles,
  },
  EditModal: {
    bodyStyles: {
      height: '100%',
      boxSizing: 'border-box',
      padding: 0,
    },
    styles: {
      display: 'unset',
    },
  },
  ContentPage: {
    styles: { padding: 0 },
  },
  PageMargins: {
    styles: pageMarginStyles.gp2,
  },
  PageConstraints: {
    containerStyles: pageContainerStyles.gp2,
    contentStyles: pageContentContainerStyles.gp2,
  },
};

export default components;
