/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useEffect, useRef, useState } from 'react';

import {
  charcoal,
  fern,
  mint,
  paper,
  rem,
  shadowSoft,
  silver,
  steel,
} from './theme';

const wrapperStyles = css({ position: 'relative', display: 'inline-flex' });

const triggerStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: rem(8),
  padding: `${rem(9)} ${rem(12)}`,
  borderRadius: rem(6),
  border: `1px solid ${steel.rgb}`,
  backgroundColor: paper.rgb,
  font: 'inherit',
  fontSize: rem(14),
  color: charcoal.rgb,
  cursor: 'pointer',
  whiteSpace: 'nowrap' as const,
});

const chevronStyles = css({
  display: 'inline-flex',
  transition: 'transform 0.1s',
});

const panelStyles = css({
  position: 'absolute',
  top: `calc(100% + ${rem(4)})`,
  left: 0,
  zIndex: 30,
  minWidth: '100%',
  margin: 0,
  padding: `${rem(4)} 0`,
  listStyle: 'none',
  backgroundColor: paper.rgb,
  border: `1px solid ${silver.rgb}`,
  borderRadius: rem(6),
  boxShadow: `0 6px 20px ${shadowSoft.rgb}`,
});

const optionStyles = css({
  display: 'block',
  width: '100%',
  padding: `${rem(10)} ${rem(16)}`,
  border: 'none',
  backgroundColor: 'transparent',
  font: 'inherit',
  fontSize: rem(14),
  color: charcoal.rgb,
  textAlign: 'left' as const,
  cursor: 'pointer',
  whiteSpace: 'nowrap' as const,
  ':hover, :focus-visible': { backgroundColor: silver.rgb },
});

const selectedOptionStyles = css({
  backgroundColor: mint.rgb,
  color: fern.rgb,
  fontWeight: 'bold',
  ':hover, :focus-visible': { backgroundColor: mint.rgb },
});

const Chevron = ({ open }: { readonly open: boolean }) => (
  <span css={[chevronStyles, open && { transform: 'rotate(180deg)' }]}>
    <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden>
      <path
        d="M1 1l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </span>
);

export type DropdownOption<T extends string> = {
  readonly value: T;
  readonly label: string;
};

const Dropdown = <T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  readonly label: string;
  readonly value: T;
  readonly options: ReadonlyArray<DropdownOption<T>>;
  readonly onChange: (next: T) => void;
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onMouseDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const current = options.find((option) => option.value === value);

  return (
    <div css={wrapperStyles} ref={wrapperRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        css={triggerStyles}
        onClick={() => setOpen((state) => !state)}
      >
        {current?.label ?? label}
        <Chevron open={open} />
      </button>
      {open && (
        <ul role="listbox" aria-label={label} css={panelStyles}>
          {options.map((option) => (
            // a listbox takes options, so the li itself carries no role
            <li key={option.value} role="none">
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                css={[
                  optionStyles,
                  option.value === value && selectedOptionStyles,
                ]}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Dropdown;
