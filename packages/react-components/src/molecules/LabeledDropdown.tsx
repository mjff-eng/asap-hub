import { css } from '@emotion/react';
import { ReactElement } from 'react';
import { Dropdown, DropdownProps, Label, Paragraph } from '../atoms';
import { colour } from '../colors';
import { rem, tabletScreen } from '../pixels';
import { TooltipInfo } from '.';

const subtitleStyles = css({
  paddingLeft: rem(6),
});

const descriptionStyles = css({
  color: colour.foreground.tertiary,
  display: 'inline-block',
  [`@media (max-width: ${tabletScreen.width - 1}px)`]: {
    display: 'unset',
  },
});

const infoWrapperStyle = css({
  paddingLeft: rem(6),
  float: 'right',
});

export type LabeledDropdownProps<V extends string> = {
  readonly title: React.ReactNode;
  readonly subtitle?: React.ReactNode;
  readonly description?: React.ReactNode;
  readonly info?: Array<ReactElement>;
} & Exclude<DropdownProps<V>, 'id'>;
export default function LabeledDropdown<V extends string>({
  title,
  subtitle,
  description,
  info,
  ...dropdownProps
}: LabeledDropdownProps<V>): ReturnType<React.FC> {
  return (
    <div>
      <Label forContent={(id) => <Dropdown {...dropdownProps} id={id} />}>
        <Paragraph noMargin styles={css({ paddingBottom: rem(16) })}>
          <strong>{title}</strong>
          <span css={subtitleStyles}>{subtitle}</span>
          {info ? (
            <TooltipInfo overrideWrapperStyles={infoWrapperStyle}>
              {info}
            </TooltipInfo>
          ) : null}
          {description ? (
            <>
              <br />
              <span css={descriptionStyles}>{description}</span>
            </>
          ) : null}
        </Paragraph>
      </Label>
    </div>
  );
}

export type LabeledDropdownType = typeof LabeledDropdown;
