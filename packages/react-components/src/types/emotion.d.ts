import { SerializedStyles } from '@emotion/react';

import { OpaqueColor, TransparentColor } from '../colors';

declare module '@emotion/react' {
  export interface Theme {
    colors?: {
      primary500?: OpaqueColor | TransparentColor;
      primary900?: OpaqueColor | TransparentColor;
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
