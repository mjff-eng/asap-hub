import { SerializedStyles } from '@emotion/react';

import { OpaqueColor, TransparentColor } from '../colors';

declare module '@emotion/react' {
  export interface Theme {
    // hex link colour for email templates, which cannot use CSS variables
    colors?: {
      primary500?: OpaqueColor | TransparentColor;
    };
    components?: {
      NavigationLink?: {
        styles: {
          svg: {
            fill: Property.fill;
          };
        };
      };
      Accordion?: {
        containerStyles: {
          padding: string;
        };
        itemStyles: {
          margin: string;
        };
      };
      Pill?: {
        styles: SerializedStyles;
      };
      TabLink?: {
        styles: SerializedStyles;
        layoutStyles: SerializedStyles;
      };
      ExternalLink?: {
        styles: SerializedStyles;
      };
      EventPage?: {
        containerStyles: SerializedStyles;
      };
      EditModal?: {
        bodyStyles: SerializedStyles;
        styles: SerializedStyles;
      };
      ContentPage?: {
        styles: SerializedStyles;
      };
    };
  }
}
