import {
  colour,
  crossQuery,
  Loading,
  navigationGrey,
  Overlay,
  ToastStack,
  usePrevious,
  useScrollToHash,
} from '@asap-hub/react-components';
import { css } from '@emotion/react';
import {
  ComponentProps,
  createRef,
  FC,
  lazy,
  ReactNode,
  Suspense,
  useEffect,
  useState,
} from 'react';
import { useLocation } from 'react-router';
import UserMenu from '../molecules/UserMenu';
import { NavigationHeader } from '../organisms';

const MainNavigation = lazy(
  () =>
    import(
      /* webpackChunkName: "main-navigation" */ '../organisms/MainNavigation'
    ),
);

const styles = css({
  height: '100%',
  position: 'relative',
  display: 'grid',
  grid: `
    "header     header"  max-content
    "main-menu  content" max-content
    "user-menu  content" 1fr / 70% 1fr
`,
  [crossQuery]: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
});

const headerStyles = css({
  gridArea: 'header',
});

const overlayStyles = css({
  gridRow: 'main-menu / -1',
  gridColumn: '1 / -1',

  visibility: 'hidden',
  [crossQuery]: {
    display: 'none',
  },
});
const overlayMenuShownStyles = css({
  visibility: 'visible',
});

const menuStyles = css({
  backgroundColor: colour.neutral[0],
  gridColumnStart: '1',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gridRow: `main-menu/-1`,
  visibility: 'hidden',
  transform: 'translateX(-100%)',
  transition: `transform 250ms ease, visibility 0s 250ms`,
  [crossQuery]: {
    display: 'none',
  },
});

const menuMenuShownStyles = css({
  visibility: 'visible',
  transform: 'translateX(0)',
  transition: `transform 250ms ease`,
});

const mainMenuStyles = css({
  gridArea: 'main-menu',
});
const userMenuStyles = css({
  backgroundColor: navigationGrey,
  gridArea: 'user-menu',
  flexGrow: 1,
});

type LayoutProps = {
  readonly children: ReactNode;
} & Omit<ComponentProps<typeof UserMenu>, 'menuShown' | 'closeUserMenu'>;
const Layout: FC<LayoutProps> = ({
  children,
  projects,
  workingGroups,
  userId,
}) => {
  const [menuShown, setMenuShown] = useState(false);

  let location: ReturnType<typeof useLocation> | undefined;
  let prevLocation: ReturnType<typeof useLocation> | undefined;
  const mainRef = createRef<HTMLDivElement>();

  // This hook *is* called unconditionally despite what rules-of-hooks says
  /* eslint-disable react-hooks/rules-of-hooks */
  try {
    location = useLocation();
    prevLocation = usePrevious(location);
    useScrollToHash();
  } catch {
    // If there is no router, fine, never auto-close the menu
  }
  /* eslint-enable react-hooks/rules-of-hooks */
  useEffect(() => {
    setMenuShown(false);
  }, [location]);
  useEffect(() => {
    if (location?.pathname !== prevLocation?.pathname && mainRef.current) {
      mainRef.current.scrollTo(0, 0);
    }
  }, [location, prevLocation, mainRef]);

  return (
    <ToastStack>
      <article css={styles}>
        <div css={headerStyles}>
          <NavigationHeader
            menuShown={menuShown}
            onToggleMenu={setMenuShown}
            userId={userId}
            projects={projects}
            workingGroups={workingGroups}
          />
        </div>

        <div
          css={css({
            gridRow: 'header-end / -1',
            gridColumn: '1 / -1',
            overflowY: 'auto',
            position: 'relative',
          })}
        >
          <main ref={mainRef}>{children}</main>
        </div>
        <div css={[overlayStyles, menuShown && overlayMenuShownStyles]}>
          <Overlay shown={menuShown} onClick={() => setMenuShown(false)} />
        </div>
        <div css={[menuStyles, menuShown && menuMenuShownStyles]}>
          <div css={[mainMenuStyles]}>
            <Suspense fallback={<Loading />}>
              <MainNavigation />
            </Suspense>
          </div>
          <div css={[userMenuStyles]}>
            <UserMenu
              userId={userId}
              projects={projects}
              workingGroups={workingGroups}
              closeUserMenu={setMenuShown}
            />
          </div>
        </div>
      </article>
    </ToastStack>
  );
};

export default Layout;
