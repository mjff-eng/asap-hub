/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FC, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';

import { useAuth } from '../auth/AuthProvider';
import { useIsAdmin, useIsCreator, useMeContext } from '../auth/MeContext';
import { Button } from '../ui/components';
import { AutoThemeIcon, MoonIcon, SunIcon } from '../ui/icons';
import {
  charcoal,
  lead,
  paper,
  rem,
  shadowMedium,
  silver,
  steel,
} from '../ui/theme';
import {
  nextThemeMode,
  readThemeMode,
  themeModeLabels,
  writeThemeMode,
  type ThemeMode,
} from '../ui/themeMode';

const headerStyles = css({
  position: 'sticky',
  top: 0,
  zIndex: 40,
  backgroundColor: paper.rgb,
  borderBottom: `1px solid ${steel.rgb}`,
});

const innerStyles = css({
  width: '100%',
  maxWidth: rem(1120),
  margin: '0 auto',
  padding: `${rem(12)} ${rem(24)}`,
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: rem(16),
});

const brandStyles = css({
  display: 'inline-flex',
  alignItems: 'baseline',
  gap: rem(8),
  textDecoration: 'none',
  color: charcoal.rgb,
  fontWeight: 'bold',
  fontSize: rem(18),
});

const brandMarkStyles = css({
  fontSize: rem(11),
  letterSpacing: rem(1.5),
  textTransform: 'uppercase',
  color: lead.rgb,
  fontWeight: 'bold',
});

const menuWrapperStyles = css({ position: 'relative' });

const menuStyles = css({
  position: 'absolute',
  right: 0,
  top: `calc(100% + ${rem(8)})`,
  zIndex: 10,
  minWidth: rem(240),
  backgroundColor: paper.rgb,
  border: `1px solid ${steel.rgb}`,
  borderRadius: rem(8),
  boxShadow: `0px 4px 12px ${shadowMedium.rgb}`,
  padding: rem(16),
  display: 'grid',
  gap: rem(12),
  justifyItems: 'start',
});

const identityStyles = css({
  display: 'grid',
  gap: rem(2),
  paddingBottom: rem(12),
  borderBottom: `1px solid ${silver.rgb}`,
  width: '100%',
});

const nameStyles = css({ fontWeight: 'bold', color: charcoal.rgb });
const emailStyles = css({ fontSize: rem(14), color: lead.rgb });

const menuLinkStyles = css({
  color: charcoal.rgb,
  fontSize: rem(14),
  textDecoration: 'none',
  ':hover': { textDecoration: 'underline' },
});

const themeToggleStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: rem(8),
  width: '100%',
  padding: `${rem(6)} ${rem(8)}`,
  margin: `0 ${rem(-8)}`,
  border: 'none',
  borderRadius: rem(6),
  background: 'none',
  font: 'inherit',
  fontSize: rem(14),
  color: charcoal.rgb,
  textAlign: 'left',
  cursor: 'pointer',
  ':hover, :focus-visible': { backgroundColor: silver.rgb },
});

const themeValueStyles = css({ marginLeft: 'auto', color: lead.rgb });

const themeIcons: Record<ThemeMode, FC<{ readonly size?: number }>> = {
  light: SunIcon,
  dark: MoonIcon,
  system: AutoThemeIcon,
};

const ThemeToggle: FC = () => {
  const [mode, setMode] = useState<ThemeMode>(readThemeMode);
  const Icon = themeIcons[mode];

  return (
    <button
      type="button"
      role="menuitem"
      css={themeToggleStyles}
      aria-label={`Theme: ${themeModeLabels[mode]}. Change theme`}
      onClick={() => {
        const next = nextThemeMode(mode);
        setMode(next);
        writeThemeMode(next);
      }}
    >
      <Icon />
      <span>Theme</span>
      <span css={themeValueStyles}>{themeModeLabels[mode]}</span>
    </button>
  );
};

const Header: FC = () => {
  const me = useMeContext();
  const isCreator = useIsCreator();
  const isAdmin = useIsAdmin();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <header css={headerStyles}>
      <div css={innerStyles}>
        <Link to="/" css={brandStyles}>
          <span css={brandMarkStyles}>ASAP</span>
          <span>Demos</span>
        </Link>
        <div css={menuWrapperStyles} ref={wrapperRef}>
          <Button
            small
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-haspopup="menu"
          >
            {me.name}
          </Button>
          {open && (
            <div css={menuStyles} role="menu">
              <div css={identityStyles} role="presentation">
                <span css={nameStyles}>{me.name}</span>
                <span css={emailStyles}>{me.email}</span>
              </div>
              {isCreator && (
                <>
                  <Link
                    to="/studio/upload"
                    role="menuitem"
                    css={menuLinkStyles}
                    onClick={() => setOpen(false)}
                  >
                    Upload a demo
                  </Link>
                  <Link
                    to="/invites"
                    role="menuitem"
                    css={menuLinkStyles}
                    onClick={() => setOpen(false)}
                  >
                    Invites
                  </Link>
                </>
              )}
              {isAdmin && (
                <Link
                  to="/users"
                  role="menuitem"
                  css={menuLinkStyles}
                  onClick={() => setOpen(false)}
                >
                  Manage users
                </Link>
              )}
              <ThemeToggle />
              <Button small role="menuitem" onClick={logout}>
                Sign out
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
