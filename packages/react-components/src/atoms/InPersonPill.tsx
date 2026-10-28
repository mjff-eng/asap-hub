import { css } from '@emotion/react';

import { colour } from '../colors';
import { MapPinIcon } from '../icons';
import { pillStyles } from '../pill';
import { rem } from '../pixels';

const styles = css([
  pillStyles,
  {
    padding: `${rem(4)} ${rem(8)}`,
    borderRadius: rem(12),
    backgroundColor: colour.background.info,
    color: colour.foreground.info,
    fontWeight: 500,
  },
]);

const InPersonPill: React.FC = () => (
  <span css={styles}>
    <MapPinIcon color={colour.foreground.info} size={16} />
    In person
  </span>
);

export default InPersonPill;
