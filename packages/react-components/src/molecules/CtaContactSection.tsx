import { css } from '@emotion/react';

import { CopyButton, Link } from '../atoms';
import { rem, smallDesktopScreen, tabletScreen } from '../pixels';
import { colors } from '..';

const contactStyles = css({
  display: 'flex',
  gap: rem(8),
  [`@media (min-width: ${smallDesktopScreen.min}px)`]: {
    alignSelf: 'center',
  },
});

const buttonStyles = css({
  display: 'flex',
  flexGrow: 1,
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    flexGrow: 'unset',
  },
});

const copyButtonStyles = css({
  backgroundColor: 'inherit',
  borderColor: colors.info200.rgb,
  ':hover, :focus': {
    borderColor: colors.colour.brand.crn[500],
  },
  path: {
    fill: colors.colour.brand.crn[500],
    stroke: colors.colour.brand.crn[500],
  },
});
interface CtaContactSectionProps {
  readonly href: string;
  readonly buttonText: string;
  readonly displayCopy?: boolean;
}
const CtaContactSection: React.FC<CtaContactSectionProps> = ({
  href,
  buttonText,
  displayCopy = false,
}) => (
  <div css={contactStyles}>
    <div css={buttonStyles}>
      <Link buttonStyle small primary href={href} noMargin>
        {buttonText}
      </Link>
    </div>
    {displayCopy && (
      <CopyButton
        hoverTooltipText="Copy Email"
        clickTooltipText="Email Copied"
        onClick={() => navigator.clipboard.writeText(href.split(':')[1] || '')}
        overrideStyles={copyButtonStyles}
      />
    )}
  </div>
);

export default CtaContactSection;
