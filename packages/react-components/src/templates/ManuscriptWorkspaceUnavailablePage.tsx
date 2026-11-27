import { css } from '@emotion/react';

import { Display, Link, Paragraph } from '../atoms';
import { colour } from '../colors';
import { LockIcon } from '../icons';
import { mediaFrom, pageMarginStyles } from '../layout';
import { rem, remUnit } from '../pixels';

const styles = css(pageMarginStyles.crn, {
  paddingTop: remUnit(36),
  paddingBottom: remUnit(36),

  display: 'grid',
  gridRowGap: rem(12),
  textAlign: 'center',
  maxWidth: rem(664),
  margin: '0 auto',

  [mediaFrom.tablet]: {
    paddingTop: remUnit(72),
    paddingBottom: remUnit(72),
    justifyItems: 'center',
  },
});

const iconStyles = css({
  svg: { width: remUnit(48), height: remUnit(48) },
});

const ManuscriptWorkspaceUnavailablePage: React.FC<
  Record<string, never>
> = () => (
  <div css={styles}>
    <span css={iconStyles}>
      <LockIcon color={colour.neutral[900]} />
    </span>
    <div>
      <Display styleAsHeading={4}>You can't access this manuscript.</Display>
      <Paragraph accent="tertiary" noMargin>
        Access to a manuscript comes from being part of the project that owns
        it, or from a project of yours that is collaborating on it. Neither
        applies to you right now, so it is not available.
      </Paragraph>
      <Paragraph accent="tertiary" noMargin>
        If you think this is wrong, contact your Project Manager.
      </Paragraph>
    </div>
    <Link buttonStyle primary href="/">
      Return to Dashboard
    </Link>
  </div>
);

export default ManuscriptWorkspaceUnavailablePage;
