/** @jsxImportSource @emotion/react */
import {
  useState,
  useEffect,
  useRef,
  ReactNode,
  MouseEventHandler,
  ComponentProps,
} from 'react';
import { css, Theme } from '@emotion/react';
import { Anchor, Button } from '../atoms';
import { rem, mobileScreen, formTargetWidth } from '../pixels';

import {
  steel,
  colorWithTransparency,
  tin,
  mint,
  lead,
  silver,
  neutral200,
  colour,
} from '../colors';

const containerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    width: '100%',
  },
});

const menuWrapperStyles = css({
  position: 'relative',
  display: 'flex',
  maxWidth: rem(formTargetWidth),
});

const menuContainerStyles = (customMenuWidth?: number) =>
  css({
    position: 'absolute',
    display: 'none',
    overflow: 'hidden',
    zIndex: 1,
    minWidth: rem(300),

    width: '100%',
    top: 0,
    right: 0,
    backgroundColor: colour.neutral[0].rgb,
    border: `1px solid ${steel.rgb}`,
    boxShadow: `0 2px 6px 0 ${colorWithTransparency(tin, 0.34).rgba}`,

    flexDirection: 'column',

    padding: `${rem(6)} 0`,
    ...(customMenuWidth
      ? {
          minWidth: rem(customMenuWidth),
          width: rem(customMenuWidth),
        }
      : {}),
  });

const showMenuStyles = css({
  display: 'flex',
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

const itemContentStyles = css({
  display: 'flex',
  columnGap: `${rem(15)}`,
  padding: `${rem(12)} ${rem(16)}`,
  fontWeight: 'normal',
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

const alignLeftStyles = css({
  left: 0,
});

export type ItemType = 'title' | 'inner' | 'default';

const itemStyles = ({
  primary100 = mint,
  primary900 = colour.brand.crn[800],
  type = 'default',
}: { type?: ItemType } & Theme['colors']) =>
  css({
    color: lead.rgb,
    backgroundColor:
      type === 'title'
        ? silver.rgba
        : type === 'inner'
          ? neutral200.rgba
          : 'none',
    ':hover': {
      backgroundColor: primary100.rgba,
      span: {
        color: primary900.rgba,
      },
    },
  });

export type ItemData = {
  item: ReactNode;
  type?: ItemType;
  asTitle?: boolean;
} & (LinkItemData | ButtonItemData);

type LinkItemData = {
  closeOnClick?: undefined;
  onClick?: undefined;
  href: string;
};
type ButtonItemData = {
  closeOnClick?: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
  href?: undefined;
};

type DropdownButtonProps = {
  children?: ReadonlyArray<ItemData>;
  buttonChildren: (menuShown: boolean) => ReactNode;
  noMargin?: boolean;
  dropdownHeight?: number;
  customMenuWidth?: number;
  alignLeft?: boolean;
} & Partial<Pick<ComponentProps<typeof Button>, 'primary'>>;

const DropdownButton: React.FC<DropdownButtonProps> = ({
  children = [],
  buttonChildren,
  noMargin = false,
  alignLeft = false,
  primary,
  dropdownHeight,
  customMenuWidth,
}) => {
  const reference = useRef<HTMLDivElement>(null);
  const handleClick = () => setMenuShown(!menuShown);
  const [menuShown, setMenuShown] = useState(false);

  const trimmedListStyles = dropdownHeight
    ? css({
        overflowY: 'auto',
        maxHeight: rem(dropdownHeight),
      })
    : null;

  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (
        reference.current &&
        !reference.current.contains(event.target as Node)
      ) {
        setMenuShown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [reference]);

  return (
    <div css={containerStyles} ref={reference}>
      <Button small primary={primary} noMargin={noMargin} onClick={handleClick}>
        {buttonChildren(menuShown)}
      </Button>
      <div css={menuWrapperStyles}>
        <div
          css={[
            menuContainerStyles(customMenuWidth),
            menuShown && showMenuStyles,
            trimmedListStyles,
            alignLeft && alignLeftStyles,
          ]}
        >
          <ul css={listStyles}>
            {children.map(
              ({ item, type, href, onClick, closeOnClick = true }, index) => (
                <li
                  key={`drop-${index}`}
                  css={({ colors }) => itemStyles({ ...colors, type })}
                >
                  {href ? (
                    <Anchor href={href} onClick={() => setMenuShown(false)}>
                      <span css={itemContentStyles}>{item}</span>
                    </Anchor>
                  ) : (
                    <button
                      css={resetButtonStyles}
                      onClick={(e) => {
                        if (closeOnClick) {
                          setMenuShown(false);
                        }
                        onClick && onClick(e);
                      }}
                    >
                      <span css={itemContentStyles}>{item}</span>
                    </button>
                  )}
                </li>
              ),
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DropdownButton;
