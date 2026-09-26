import { css } from '@emotion/react';
import {
  components,
  GroupBase,
  MultiValueGenericProps,
  OptionProps,
} from 'react-select';

import { Pill } from '../atoms';
import { colour } from '../colors';
import { article } from '../icons';
import { rem } from '../pixels';
import { getMultiValueStyles } from '../select';
import type { ResearchOutputOption } from './research-output-form';

const TITLE_MAX_LENGTH = 60;

const truncateTitle = (text: React.ReactNode): React.ReactNode => {
  if (typeof text === 'string' && text.length > TITLE_MAX_LENGTH) {
    return `${text.slice(0, TITLE_MAX_LENGTH)}…`;
  }
  return text;
};

const optionGridStyles = (showPill: boolean) =>
  css({
    display: 'grid',
    gridTemplateColumns: `min-content auto${showPill ? ' min-content' : ''}`,
    justifyItems: 'start',
    alignItems: 'center',
    alignContent: 'center',
    columnGap: '12px',
  });

const articleSelectIconStyles = css({
  svg: {
    width: '18px',
    height: '18px',
    paddingLeft: rem(3),
    paddingTop: rem(4.5),
    stroke: colour.foreground.primary,
    strokeWidth: rem(0.3),
  },
});

type CreateArticleSelectComponentsOptions<T extends ResearchOutputOption> = {
  getIcon: (data: T) => React.ReactNode;
  showArticlePill: (data: T) => boolean;
};

export const createArticleSelectComponents = <T extends ResearchOutputOption>({
  getIcon,
  showArticlePill,
}: CreateArticleSelectComponentsOptions<T>) => ({
  MultiValueContainer: (
    multiValueContainerProps: MultiValueGenericProps<T, true, GroupBase<T>>,
  ) => (
    <div
      css={{
        ...getMultiValueStyles(multiValueContainerProps.selectProps.styles),
        paddingLeft: rem(8),
      }}
    >
      {multiValueContainerProps.children}
    </div>
  ),
  MultiValueLabel: (
    multiValueLabelProps: MultiValueGenericProps<T, true, GroupBase<T>>,
  ) => {
    const label = multiValueLabelProps.children;
    const isTruncated =
      typeof label === 'string' && label.length > TITLE_MAX_LENGTH;

    return (
      <components.MultiValueLabel {...multiValueLabelProps}>
        <div css={optionGridStyles(showArticlePill(multiValueLabelProps.data))}>
          <div css={articleSelectIconStyles}>
            {getIcon(multiValueLabelProps.data)}
          </div>
          <span title={isTruncated ? label : undefined}>
            {truncateTitle(label)}
          </span>
          {showArticlePill(multiValueLabelProps.data) && (
            <Pill accent="gray">{multiValueLabelProps.data.type}</Pill>
          )}
        </div>
      </components.MultiValueLabel>
    );
  },
  Option: (optionProps: OptionProps<T, true, GroupBase<T>>) => (
    <components.Option {...optionProps}>
      <div css={optionGridStyles(showArticlePill(optionProps.data))}>
        <div css={articleSelectIconStyles}>{getIcon(optionProps.data)}</div>
        <div>{optionProps.children}</div>
        {showArticlePill(optionProps.data) && (
          <Pill accent="gray">{optionProps.data.type}</Pill>
        )}
      </div>
    </components.Option>
  ),
});

export const articleSelectComponents =
  createArticleSelectComponents<ResearchOutputOption>({
    getIcon: () => article,
    showArticlePill: (data) => !!data.type,
  });
