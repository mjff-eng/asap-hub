import { fontStyles } from '../text';

const { fontFamily } = fontStyles;

/* istanbul ignore file */

const showPasswordIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 43 24">
    <title>Show</title>
    <text
      x="50%"
      y="50%"
      stroke="none"
      style={{
        fontFamily,
        // In units of the 43 x 24 viewBox, so the label keeps fitting whatever
        // the browser font size setting; the svg itself scales with the layout
        fontSize: 16,

        dominantBaseline: 'central',
        textAnchor: 'middle',
      }}
    >
      Show
    </text>
  </svg>
);

export default showPasswordIcon;
