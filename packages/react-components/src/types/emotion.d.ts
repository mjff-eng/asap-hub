import { SerializedStyles } from '@emotion/react';

declare module '@emotion/react' {
  export interface Theme {
    // hex colours for email templates, which cannot use CSS variables
    colors?: {
      link?: string;
      buttonBackground?: string;
      buttonBorder?: string;
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
