import { ToastContext } from '@asap-hub/react-context';
import { css } from '@emotion/react';
import {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Button, Spinner } from '../atoms';
import { neutral500, neutral900 } from '../colors';
import { ExportIcon } from '../icons';
import { mobileScreen, rem, tabletScreen } from '../pixels';
import TooltipInfo from './TooltipInfo';

const exportSectionStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(15),

  [`@media (max-width: ${tabletScreen.min}px)`]: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginTop: rem(24),
    width: '100%',
  },
});

const exportButtonStyles = css({
  gap: rem(8),
  height: '100%',
  alignItems: 'center',
  padding: rem(9),
  paddingRight: rem(15),
  [`@media (max-width: ${tabletScreen.min}px)`]: {
    width: '100%',
  },

  [`@media (min-width:${tabletScreen.min}px) and (max-width: ${mobileScreen.max}px)`]:
    {
      minWidth: 'auto',
    },
});

const infoWrapperStyle = css({
  verticalAlign: 'middle',
});

const tooltipStyle = css({
  textAlign: 'left',
});

// Match ExportIcon's intrinsic 18×18 footprint so swapping in the spinner
// doesn't reflow the button width.
const exportIconStyles = css({
  display: 'flex',
  width: rem(18),
  height: rem(18),
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

type ExportButtonProps = {
  readonly exportResults?: () => Promise<void>;
  readonly buttons?: Array<{
    buttonText: string;
    errorMessage: string;
    exportResults?: () => Promise<void>;
  }>;
  readonly info?: ReactNode;
};

const ExportButton: React.FC<ExportButtonProps> = ({
  exportResults,
  info,
  buttons,
}) => {
  const defaultButton = {
    exportResults,
    buttonText: 'CSV',
    errorMessage: 'There was an issue exporting to CSV. Please try again.',
  };
  const buttonGroup = (buttons?.length ? buttons : [defaultButton]).filter(
    (button) => !!button.exportResults,
  );

  const toast = useContext(ToastContext);
  // Per-button loading state keyed by buttonText so each button shows its
  // spinner independently while exports may take a while to fetch data.
  const [loadingButtons, setLoadingButtons] = useState<
    Readonly<Record<string, boolean>>
  >({});
  // Track mount so we don't schedule a state update after the component has
  // been unmounted (e.g. tests that finish the click then unmount without
  // awaiting the export's resolution).
  const mountedRef = useRef(true);
  useEffect(() => {
    // Re-assert mounted on every mount. Under React 18 StrictMode the dev
    // double-invoke runs the cleanup once (setting this false), and useRef's
    // initializer does NOT re-run on the remount — so without this the ref
    // stays false forever and setLoading silently no-ops.
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const setLoading = useCallback((buttonText: string, value: boolean) => {
    if (!mountedRef.current) return;
    setLoadingButtons((previous) => ({
      ...previous,
      [buttonText]: value,
    }));
  }, []);

  return buttonGroup.length ? (
    <span css={exportSectionStyles}>
      <strong>
        Download:
        {info ? (
          <TooltipInfo
            overrideWrapperStyles={infoWrapperStyle}
            overrideTooltipStyles={tooltipStyle}
          >
            {info}
          </TooltipInfo>
        ) : null}
      </strong>
      {buttonGroup.map((button) => {
        const isLoading = loadingButtons[button.buttonText] === true;
        return (
          <Button
            key={button.buttonText}
            noMargin
            small
            enabled={!isLoading}
            onClick={async () => {
              if (isLoading) return;
              // Show the spinner, then yield a macrotask before starting the
              // export so the loading render commits and paints before any
              // synchronous export work (CSV/XLSX stringify) blocks the thread.
              setLoading(button.buttonText, true);
              await new Promise<void>((resolve) => {
                setTimeout(resolve, 0);
              });
              const startedAt = Date.now();
              try {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                await button.exportResults!();
              } catch {
                toast(button.errorMessage);
              } finally {
                // Keep the spinner visible for at least 250ms even on very
                // fast exports so it doesn't flicker imperceptibly.
                const elapsed = Date.now() - startedAt;
                const remaining = Math.max(0, 250 - elapsed);
                if (remaining > 0) {
                  await new Promise<void>((resolve) => {
                    setTimeout(resolve, remaining);
                  });
                }
                setLoading(button.buttonText, false);
              }
            }}
            overrideStyles={exportButtonStyles}
          >
            <>
              <div css={exportIconStyles}>
                {isLoading ? (
                  <Spinner
                    size={16}
                    thickness={2}
                    color={neutral900.rgb}
                    trackColor={neutral500.rgb}
                    ariaLabel="Exporting"
                    css={{ flexShrink: 0 }}
                  />
                ) : (
                  ExportIcon
                )}
              </div>
              {button.buttonText}
            </>
          </Button>
        );
      })}
    </span>
  ) : null;
};

export default ExportButton;
