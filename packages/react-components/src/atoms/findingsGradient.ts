import { iris, colour } from '../colors';

// Multi-stop brand ramp (purple → blue → teal → green) shared by the
// preliminary-findings wheel and bar so the two can't drift apart.
const findingsRampStops = `${iris.hex} 30.25%, ${colour.brand.gp2[500]} 51.91%, #1491B2 66.74%, #299C86 79.82%, ${colour.brand.crn[500]} 90.01%`;

export const findingsGradient = `linear-gradient(90deg, ${findingsRampStops})`;

// Green sits near 100% then blends back to purple at the seam so the ring loops.
export const findingsConicRamp = `conic-gradient(from 0deg, ${findingsRampStops}, ${iris.hex} 100%)`;
