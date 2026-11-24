import {
  mediaBelow,
  NavigationLink as Link,
  pixels,
} from '@asap-hub/react-components';
import { css } from '@emotion/react';
import { ComponentProps } from 'react';
import { headerLinkStyles } from '../layout';

const { rem } = pixels;

const horizontalNavigationStyles = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: rem(4),
  width: rem(80),
});

const NavigationLink: React.FC<ComponentProps<typeof Link>> = ({
  icon,
  children,
  ...props
}) => (
  <>
    <span
      css={[
        headerLinkStyles,
        css({
          [mediaBelow.laptop]: {
            display: 'none',
          },
        }),
      ]}
    >
      <Link {...props} squareBorder>
        <span css={horizontalNavigationStyles}>
          {icon}
          {children}
        </span>
      </Link>
    </span>
    <span
      css={css({
        display: 'none',
        [mediaBelow.laptop]: {
          display: 'unset',
        },
      })}
    >
      <Link {...props} icon={icon} squareBorder>
        {children}
      </Link>
    </span>
  </>
);

export default NavigationLink;
