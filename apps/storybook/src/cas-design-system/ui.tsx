import { CSSProperties, ReactNode, useState } from 'react';
import { colour } from '@asap-hub/react-components';
import { contrast, cssColour } from './tokens';

export const mono: CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '12px',
};

export const muted: CSSProperties = {
  color: colour.foreground.quaternary,
  fontSize: '12px',
};

export const Page = ({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) => (
  <div
    style={{
      fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
      color: colour.foreground.primary,
      background: colour.background.primary,
      maxWidth: '1080px',
      padding: '24px',
      fontSize: '14px',
      lineHeight: 1.5,
    }}
  >
    <h1 style={{ fontSize: '24px', margin: '0 0 8px' }}>{title}</h1>
    {intro && (
      <div style={{ color: colour.foreground.tertiary, marginBottom: '24px' }}>
        {intro}
      </div>
    )}
    {children}
  </div>
);

export const Section = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section style={{ margin: '32px 0' }}>
    <h2
      style={{
        fontSize: '16px',
        margin: '0 0 12px',
        paddingBottom: '6px',
        borderBottom: `1px solid ${colour.border.tertiary}`,
      }}
    >
      {title}
    </h2>
    {children}
  </section>
);

export const Swatch = ({
  background,
  size = 32,
  label,
}: {
  background: string;
  size?: number;
  label?: string;
}) => (
  <span
    title={label}
    style={{
      display: 'inline-block',
      flexShrink: 0,
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '6px',
      border: `1px solid ${colour.border.tertiary}`,
      background: `linear-gradient(${background}, ${background}), repeating-conic-gradient(${colour.neutral[100].hex} 0% 25%, ${colour.neutral[0].hex} 0% 50%) 0 0 / 10px 10px`,
    }}
  />
);

export const useCopy = (text: string) => {
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      },
      () => undefined,
    );
  return { copied, copy };
};

export const Copy = ({ text }: { text: string }) => {
  const { copied, copy } = useCopy(text);
  return (
    <button
      type="button"
      title="Copy"
      onClick={copy}
      style={{
        ...mono,
        cursor: 'pointer',
        border: `1px solid ${
          copied ? colour.border.success : colour.border.tertiary
        }`,
        background: copied
          ? colour.background.success
          : colour.background.secondary,
        color: colour.foreground.primary,
        borderRadius: '4px',
        padding: '2px 6px',
        textAlign: 'left',
      }}
    >
      {copied ? 'copied' : text}
    </button>
  );
};

const chipColours = {
  green: [colour.background.success, colour.foreground.success],
  amber: [colour.background.warning, colour.foreground.warning],
  red: [colour.background.error, colour.foreground.error],
  blue: [colour.background.info, colour.foreground.info],
  grey: [colour.background.tertiary, colour.foreground.tertiary],
} as const;

export const Chip = ({
  kind,
  children,
}: {
  kind: keyof typeof chipColours;
  children: ReactNode;
}) => (
  <span
    style={{
      display: 'inline-block',
      fontSize: '11px',
      fontWeight: 500,
      borderRadius: '10px',
      padding: '1px 8px',
      whiteSpace: 'nowrap',
      background: chipColours[kind][0],
      color: chipColours[kind][1],
    }}
  >
    {children}
  </span>
);

export const ContrastBadge = ({
  foreground,
  background,
}: {
  foreground: string;
  background: string;
}) => {
  const ratio = contrast(foreground, background);
  const kind = ratio >= 4.5 ? 'green' : ratio >= 3 ? 'amber' : 'red';
  const label =
    ratio >= 4.5 ? 'AA text' : ratio >= 3 ? 'AA large only' : 'fails AA';
  return (
    <Chip kind={kind}>
      {ratio}:1 {label}
    </Chip>
  );
};

export const TextSample = ({
  foreground,
  background,
  children,
}: {
  foreground: string;
  background: string;
  children: ReactNode;
}) => (
  <div
    style={{
      background: cssColour(background),
      color: cssColour(foreground),
      border: `1px solid ${colour.border.tertiary}`,
      borderRadius: '6px',
      padding: '10px 12px',
    }}
  >
    {children}
    <div style={{ marginTop: '6px' }}>
      <ContrastBadge foreground={foreground} background={background} />
    </div>
  </div>
);
