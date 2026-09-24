import { magenta, iris, colour } from './colors';

export const ceruleanFernGradientStyles = {
  background: `linear-gradient(to right, ${colour.brand.gp2[500]}, ${colour.brand.crn[500]})`,
} as const;
export const magentaCeruleanGradientStyles = {
  background: `linear-gradient(to right, ${magenta.rgb}, ${colour.brand.gp2[500]})`,
} as const;
export const irisCeruleanGradientStyles = {
  background: `linear-gradient(to right, ${iris.rgb}, ${colour.brand.gp2[500]})`,
} as const;
