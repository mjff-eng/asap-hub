import { ComponentProps } from 'react';
import { css } from '@emotion/react';
import { urlExpression } from '@asap-hub/validation';

import { Link, Tooltip } from '../atoms';
import { colour } from '../colors';
import { useTooltipTrigger } from '../hooks';
import { rem, mobileScreen, tabletScreen } from '../pixels';
import { fontStyles } from '../text';

const containerStyles = css({
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    marginTop: rem(15),
    width: '100%',
  },
});

const tooltipContainerStyles = css({
  position: 'relative',
  height: 0,
});

const tooltipWidth = 160;

const tooltipBubbleStyles = css({
  padding: rem(12),
  borderRadius: rem(8),

  [`@media (max-width: ${tabletScreen.width - 1}px)`]: {
    maxWidth: rem(tooltipWidth),
    marginLeft: 0,
    marginRight: 0,
  },
});

const tooltipTextStyles = css({
  display: 'block',
  fontFamily: `'Nunito Sans', ${fontStyles.fontFamily}`,
  fontSize: rem(14),
  lineHeight: 24 / 14,
});

const isValidMeetingLink = (meetingLink?: string): meetingLink is string =>
  !!meetingLink && new RegExp(urlExpression).test(meetingLink);

type JoinMeetingButtonProps = {
  readonly meetingLink?: string;
  readonly tooltipPosition?: ComponentProps<typeof Tooltip>['position'];
};

const JoinMeetingButton: React.FC<JoinMeetingButtonProps> = ({
  meetingLink,
  tooltipPosition = 'top',
}) => {
  const { shown: tooltipShown, triggerProps } =
    useTooltipTrigger<HTMLDivElement>({ openOnHover: true });

  const tooltip = (
    <div css={tooltipContainerStyles}>
      <Tooltip
        shown={tooltipShown}
        position={tooltipPosition}
        width={tooltipWidth}
        background={colour.foreground['color-blue']}
        textStyles={tooltipBubbleStyles}
      >
        <span css={tooltipTextStyles}>
          We’re sorry but we couldn’t find the link to this event.
          <br />
          Please contact ASAP for more information.
        </span>
      </Tooltip>
    </div>
  );

  if (isValidMeetingLink(meetingLink)) {
    return (
      <div css={containerStyles}>
        <Link href={meetingLink} noMargin primary buttonStyle small>
          Join Meeting Now
        </Link>
      </div>
    );
  }

  return (
    <div role="presentation" css={containerStyles} {...triggerProps}>
      {tooltipPosition === 'top' && tooltip}
      <Link href={undefined} enabled={false} noMargin buttonStyle small>
        Join Meeting Now
      </Link>
      {tooltipPosition === 'bottom' && tooltip}
    </div>
  );
};

export default JoinMeetingButton;
