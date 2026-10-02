/** @jsxImportSource @emotion/react */
import {
  useState,
  useEffect,
  useRef,
  ReactNode,
  MouseEventHandler,
  ComponentProps,
} from 'react';
import { css } from '@emotion/react';
import {
  Button,
  chevronUpIcon,
  chevronDownIcon,
  successIconNew,
  infoCircleYellowIcon,
} from '..';

import { rem, mobileScreen, formTargetWidth } from '../pixels';
import { Portal } from '../utils/portal';

import { colourWithAlpha, colour } from '../colors';

const containerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    width: '100%',
  },
});

type MenuPosition = {
  top: number;
  left: number;
};

const menuOffset = 8;

const menuContainerStyles = ({ top, left }: MenuPosition) =>
  css({
    position: 'fixed',
    display: 'flex',
    overflow: 'hidden',
    zIndex: 1,
    width: rem(280),
    maxWidth: rem(formTargetWidth),
    top,
    left,
    backgroundColor: colour.background.primary,
    border: `1px solid ${colour.border.tertiary}`,
    boxShadow: `0 2px 6px 0 ${colourWithAlpha(colour.neutral[200], 0.34)}`,
    flexDirection: 'column',
    padding: `${rem(6)} 0`,
  });

const listStyles = css({
  display: 'flex',
  flexDirection: 'column',
  listStyle: 'none',
  margin: 0,
  padding: 0,

  '& > li': {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'stretch',
  },
});

export type StatusType = 'warning' | 'final' | 'default' | 'none';

export const itemContentStyles = (type: StatusType = 'default') =>
  css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'start',
    columnGap: rem(15),
    padding: `${rem(4)} ${rem(14)}`,
    fontWeight: 'normal',
    fontSize: '14px',
    margin: `${rem(8)} ${rem(16)} !important`,
    backgroundColor: colour.background.info,
    color: colour.foreground.info,
    borderRadius: rem(24),
    alignSelf: 'initial',
    maxWidth: 'fit-content',
    ...(type === 'warning' || type === 'final'
      ? {
          color:
            type === 'warning'
              ? colour.foreground.warning
              : colour.foreground.success,
          backgroundColor:
            type === 'warning'
              ? colour.background.warning
              : colour.background.success,
          columnGap: rem(6),
          padding: `${rem(4)} ${rem(16)} ${rem(4)} ${rem(8)}`,
        }
      : {}),
  });

const resetButtonStyles = css({
  padding: 0,
  margin: 0,
  border: 0,
  background: 'none',
  cursor: 'pointer',
  color: 'inherit',

  ':focus': {
    outline: 'none',
    boxShadow: 'none',
  },
});

const statusColours = (status: 'info' | 'warning' | 'success') => ({
  background: colour.background[status],
  color: colour.foreground[status],
});

export const statusButtonStyles = (
  type: StatusType,
  isComplianceReviewer: boolean,
  noWrap: boolean = true,
) =>
  css({
    borderRadius: rem(24),
    fontWeight: 400,
    border: 'none',
    ...statusColours(
      type === 'warning' ? 'warning' : type === 'final' ? 'success' : 'info',
    ),
    'svg #Group-7': {
      stroke: colour.foreground.info,
      ...([isComplianceReviewer ? 'warning' : 'default', 'final'].includes(type)
        ? {
            stroke: colour.foreground.warning,
          }
        : {}),
    },
    paddingLeft: rem(16),
    paddingRight: `${rem(8)} !important`,
    ...(noWrap ? { textWrap: 'nowrap' } : {}),
    maxWidth: 'fit-content',
    display: 'flex',
    alignItems: 'center',
    gap: rem(8),
  });

export const statusTagStyles = (type: StatusType, noWrap: boolean = true) =>
  css({
    borderRadius: rem(24),
    fontWeight: 400,
    border: 'none',
    ...statusColours(
      type === 'default' ? 'warning' : type === 'final' ? 'success' : 'info',
    ),
    paddingLeft: rem(16),
    paddingRight: rem(16),
    ...(noWrap ? { textWrap: 'nowrap' } : {}),
    maxWidth: 'fit-content',
    display: 'flex',
    alignItems: 'center',
    gap: rem(8),
  });

const itemStyles = css({
  color: colour.foreground.tertiary,
  backgroundColor: 'none',
  ':hover': {
    backgroundColor: colour.background.secondary,
  },
});

export const iconStyles = (type: string, isComplianceReviewer: boolean) =>
  css({
    display: 'flex',
    alignSelf: 'center',

    '& > svg': {
      width: '16px',
      height: '16px',
      filter: 'revert!important',
      WebkitFilter: 'revert!important',
      ...((type === 'warning' && isComplianceReviewer) ||
      (type === 'default' && !isComplianceReviewer)
        ? {
            '& > g > path': {
              fill: colour.foreground.warning,
            },
          }
        : {}),
      '& > rect:first-of-type': {
        ...(type === 'final' ? { fill: colour.foreground.success } : {}),
      },
      '& > rect:last-of-type': {
        stroke: colour.foreground.info,
        ...(type === 'final' ? { stroke: colour.foreground.success } : {}),
      },
    },
  });

export const statusIcon = (type: StatusType, isComplianceReviewer: boolean) =>
  ({
    warning: isComplianceReviewer ? infoCircleYellowIcon : '',
    final: successIconNew,
    default: isComplianceReviewer ? '' : infoCircleYellowIcon,
    none: '',
  })[type];

type ButtonItemData = {
  item: ReactNode;
  type?: StatusType;
  closeOnClick?: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
};

type StatusButtonProps = {
  children?: ReadonlyArray<ButtonItemData>;
  buttonChildren: (menuShown: boolean) => ReactNode;
  alignLeft?: boolean;
  canEdit?: boolean;
  selectedStatusType?: StatusType;
  wrap?: boolean;
} & Partial<Pick<ComponentProps<typeof Button>, 'primary'>>;

const StatusButton: React.FC<StatusButtonProps> = ({
  children = [],
  buttonChildren,
  primary,
  canEdit = false,
  selectedStatusType = 'none',
  wrap = false,
}) => {
  const reference = useRef<HTMLDivElement>(null);
  const menuReference = useRef<HTMLDivElement>(null);
  const [menuShown, setMenuShown] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);

  const updateMenuPosition = () => {
    const rect = reference.current?.getBoundingClientRect();

    if (rect) {
      setMenuPosition({
        top: rect.bottom + menuOffset,
        left: rect.left,
      });
    }
  };

  const handleClick = () => {
    if (!menuShown) {
      updateMenuPosition();
    }

    setMenuShown(!menuShown);
  };

  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as Node;
      const isClickInsideButton = reference.current?.contains(target);
      const isClickInsideMenu = menuReference.current?.contains(target);

      if (!isClickInsideButton && !isClickInsideMenu) {
        setMenuShown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!menuShown) {
      return undefined;
    }

    const closeMenu = () => setMenuShown(false);

    window.addEventListener('resize', closeMenu);
    window.addEventListener('scroll', closeMenu, true);

    return () => {
      window.removeEventListener('resize', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, [menuShown]);

  const hasIcon = ['final', canEdit ? 'warning' : 'default'].includes(
    selectedStatusType,
  );

  return (
    <div css={containerStyles} ref={reference}>
      <Button
        data-testid="status-button"
        small
        noMargin
        primary={primary}
        onClick={handleClick}
        enabled={canEdit}
        overrideStyles={
          canEdit
            ? statusButtonStyles(selectedStatusType, canEdit, !wrap)
            : statusTagStyles(selectedStatusType, !wrap)
        }
      >
        {hasIcon && (
          <span css={iconStyles(selectedStatusType, canEdit)}>
            {statusIcon(selectedStatusType, canEdit)}
          </span>
        )}
        {buttonChildren(menuShown)}
        {canEdit ? (menuShown ? chevronUpIcon : chevronDownIcon) : null}
      </Button>
      {menuShown && menuPosition && (
        <Portal>
          <div ref={menuReference} css={menuContainerStyles(menuPosition)}>
            <ul css={listStyles}>
              {children.map(
                (
                  { item, type = 'default', onClick, closeOnClick = true },
                  index,
                ) => (
                  <li key={`drop-${index}`} css={itemStyles}>
                    <button
                      css={[resetButtonStyles]}
                      onClick={(e) => {
                        if (closeOnClick) {
                          setMenuShown(false);
                        }
                        onClick && onClick(e);
                      }}
                    >
                      <span css={itemContentStyles(type)}>
                        {['warning', 'final'].includes(type) && (
                          <span css={iconStyles(type, canEdit)}>
                            {statusIcon(type, canEdit)}
                          </span>
                        )}
                        <span>{item}</span>
                      </span>
                    </button>
                  </li>
                ),
              )}
            </ul>
          </div>
        </Portal>
      )}
    </div>
  );
};

export default StatusButton;
