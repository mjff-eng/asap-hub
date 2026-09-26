import { css } from '@emotion/react';
import { ReactElement, ReactNode } from 'react';
import {
  MultiSelect,
  MultiSelectProps,
  MultiSelectOptionsType,
  Paragraph,
  Label,
} from '../atoms';
import { colour } from '../colors';
import { rem } from '../pixels';

const subtitleStyles = css({
  paddingLeft: rem(6),
});

const descriptionStyles = css({
  color: colour.foreground.tertiary,
});

export type LabeledMultiSelectProps<
  T extends MultiSelectOptionsType,
  M extends boolean = true,
> = {
  readonly title: ReactNode;
  readonly subtitle?: React.ReactNode;
  readonly description?: ReactNode;
} & Exclude<MultiSelectProps<T, M>, 'id'>;

const LabeledMultiSelect = <
  T extends MultiSelectOptionsType,
  M extends boolean = true,
>({
  title,
  subtitle,
  description,
  ...multiSelectProps
}: LabeledMultiSelectProps<T, M>): ReactElement => (
  <div>
    <Label
      forContent={(id) => (
        <MultiSelect noMargin {...multiSelectProps} id={id} />
      )}
    >
      <Paragraph noMargin styles={css({ paddingBottom: rem(16) })}>
        <strong>{title}</strong>
        <span css={subtitleStyles}>{subtitle}</span>
        <br />
        <span css={descriptionStyles}>{description}</span>
      </Paragraph>
    </Label>
  </div>
);

export default LabeledMultiSelect;
