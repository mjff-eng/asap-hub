import { colorFromHex, colour, success500 } from '@asap-hub/react-components';

const colors = {
  greyscale1000: colorFromHex(colour.neutral[600]),
  info100: colorFromHex(colour.brand.gp2[25]),
  info150: colorFromHex(colour.brand.gp2[100]),
  info500: colorFromHex(colour.brand.gp2[500]),
  info900: colorFromHex(colour.brand.gp2[800]),
  neutral000: colorFromHex(colour.neutral[0]),
  neutral1000: colorFromHex(colour.neutral[900]),
  neutral500: colorFromHex(colour.neutral[100]),
  neutral700: colorFromHex(colour.neutral[200]),
  neutral800: colorFromHex(colour.neutral[400]),
  neutral900: colorFromHex(colour.neutral[600]),
  primary100: colorFromHex(colour.brand.gp2[25]),
  primary500: colorFromHex(colour.brand.gp2[500]),
  primary900: colorFromHex(colour.brand.gp2[800]),
  secondary500: success500,
  success500,
  warning500: colorFromHex(colour.utilitarian.orange[600]),
};
export default colors;
