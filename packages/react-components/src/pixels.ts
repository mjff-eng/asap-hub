export const lineHeight = 24;
export const perRem = 16;

export interface Screen {
  width: number;
  height: number;
  min: number;
  max: number;
}
export const screen = (width: number, height: number): Screen => ({
  width,
  height,
  min: Math.min(width, height),
  max: Math.max(width, height),
});

export const rem = (value: number): `${number}em` => `${value / perRem}em`;

export const mobileScreen = screen(375, 667);
export const tabletScreen = screen(768, (768 * 3) / 4);
export const smallDesktopScreen = screen(1024, (1024 * 3) / 4);
export const largeDesktopScreen = screen(1440, (1440 * 3) / 4);

export const vminLinearCalc = (
  smallScreen: Screen,
  smallValue: number,
  largeScreen: Screen,
  largeValue: number,
  unit: string,
): string => {
  const valueDiff = largeValue - smallValue;
  const screenDiff = largeScreen.min - smallScreen.min;

  const valuePerVmin = (valueDiff * 100) / screenDiff;
  const minValue = smallValue - (valueDiff * smallScreen.min) / screenDiff;

  return `calc(${minValue}${unit} + ${valuePerVmin}vmin)`;
};

export const vminLinearCalcClamped = (
  smallScreen: Screen,
  smallValue: number,
  largeScreen: Screen,
  largeValue: number,
  unit: string,
): string =>
  `clamp(${Math.min(smallValue, largeValue)}${unit}, ${vminLinearCalc(
    smallScreen,
    smallValue,
    largeScreen,
    largeValue,
    unit,
  )}, ${Math.max(smallValue, largeValue)}${unit})`;

export const formTargetWidth = 354;
