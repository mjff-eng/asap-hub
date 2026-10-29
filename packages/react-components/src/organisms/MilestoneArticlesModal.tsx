import { css } from '@emotion/react';
import { ComponentProps, useState } from 'react';
import { ArticleItem, ResearchOutputType } from '@asap-hub/model';

import { LabeledMultiSelect, Modal } from '../molecules';
import { crossIcon } from '../icons';
import { Button, Headline3 } from '../atoms';
import { mobileScreen, rem } from '../pixels';
import { ResearchOutputOption } from '../utils';
import { articleSelectComponents } from '../utils/article-select-components';
import Toast from './Toast';

const headerStyles = css({
  display: 'flex',
  flexDirection: 'row-reverse',
  justifyContent: 'space-between',
  alignItems: 'center',
});

const controlsContainerStyles = css({
  display: 'flex',
  alignItems: 'flex-start',
});

const widerModalStyles = css({
  width: '90%',
  maxWidth: rem(1060),
  boxSizing: 'content-box',
});

const buttonMediaQuery = `@media (min-width: ${mobileScreen.max - 100}px)`;

const buttonContainerStyles = (menuOpen: boolean) =>
  css({
    display: 'grid',
    columnGap: rem(24),
    gridTemplateRows: 'max-content 12px max-content',
    [buttonMediaQuery]: {
      gridTemplateColumns: 'max-content max-content',
      gridTemplateRows: 'auto',
      justifyContent: 'flex-end',
    },
    paddingTop: menuOpen ? rem(288) : rem(72),
    transition: 'padding-top 0.2s ease',
  });

const confirmStyles = css({
  display: 'flex',
  justifyContent: 'center',
  gridRow: '1 / span 2',
  gridColumn: '1',
  [buttonMediaQuery]: {
    gridRow: '1',
    gridColumn: '2',
  },
});

const cancelStyles = css({
  display: 'flex',
  justifyContent: 'center',
  gridRow: '2 / span 2',
  gridColumn: '1',
  [buttonMediaQuery]: {
    gridRow: '1',
  },
});

const selectContainerStyles = css({});

const headerWrapStyles = css({
  padding: `${rem(32)} ${rem(24)} ${rem(16)}`,
});

const contentWrapStyles = css({
  padding: `${rem(16)} ${rem(24)} ${rem(32)}`,
});

export const articlesToOptions = (
  articles: ReadonlyArray<ArticleItem>,
): ResearchOutputOption[] =>
  articles.map((a) => ({
    value: a.id,
    label: a.title,
    documentType: 'Article',
    type: a.type,
  }));

const optionsToArticles = (
  options: ReadonlyArray<ResearchOutputOption>,
): ReadonlyArray<ArticleItem> =>
  options.map((o) => ({
    id: o.value,
    title: o.label,
    href: `/shared-research/${o.value}`,
    type: o.type as ResearchOutputType | undefined,
  }));

type MilestoneArticlesModalProps = {
  readonly articles: ReadonlyArray<ArticleItem>;
  readonly onClose: () => void;
  readonly onConfirm: (articles: ReadonlyArray<ArticleItem>) => Promise<void>;
  readonly loadOptions: NonNullable<
    ComponentProps<
      typeof LabeledMultiSelect<ResearchOutputOption>
    >['loadOptions']
  >;
};

const MilestoneArticlesModal: React.FC<MilestoneArticlesModalProps> = ({
  articles: initialArticles,
  onClose,
  onConfirm,
  loadOptions,
}) => {
  const [selectedOptions, setSelectedOptions] = useState<
    ResearchOutputOption[]
  >(articlesToOptions(initialArticles));
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRequestInProgress, setIsRequestInProgress] = useState(false);
  const [hasError, setHasError] = useState(false);
  const hasArticles = initialArticles.length > 0;
  const title = hasArticles ? 'Edit Related Articles' : 'Add Related Articles';

  const handleConfirm = async () => {
    if (isRequestInProgress) return;
    setHasError(false);
    setIsRequestInProgress(true);
    try {
      await onConfirm(optionsToArticles(selectedOptions));
      onClose();
    } catch {
      setHasError(true);
    } finally {
      setIsRequestInProgress(false);
    }
  };

  return (
    <Modal padding={false} overrideModalStyles={widerModalStyles}>
      <div css={headerWrapStyles}>
        <header css={headerStyles}>
          <div css={controlsContainerStyles}>
            <Button
              small
              noMargin
              onClick={onClose}
              enabled={!isRequestInProgress}
            >
              {crossIcon}
            </Button>
          </div>
          <Headline3 styleAsHeading={5} noMargin>
            {title}
          </Headline3>
        </header>
      </div>
      <div css={contentWrapStyles}>
        {hasError && (
          <Toast>An error has occurred. Please try again later.</Toast>
        )}
        <div>
          <div css={selectContainerStyles}>
            <LabeledMultiSelect<ResearchOutputOption>
              title=""
              description="Add any articles associated with this milestone. Only published articles on the CRN Hub will be available to select. These articles will also be displayed in the corresponding Aim."
              placeholder="Start typing..."
              values={selectedOptions}
              loadOptions={loadOptions}
              onChange={(newValues) => {
                setSelectedOptions([...newValues]);
                setHasError(false);
              }}
              noOptionsMessage={() => 'No articles found'}
              components={articleSelectComponents}
              onMenuOpen={() => setIsMenuOpen(true)}
              onMenuClose={() => setIsMenuOpen(false)}
              enabled={!isRequestInProgress}
            />
          </div>
          <div css={buttonContainerStyles(isMenuOpen)}>
            <div css={cancelStyles}>
              <Button noMargin onClick={onClose} enabled={!isRequestInProgress}>
                Cancel
              </Button>
            </div>
            <div css={confirmStyles}>
              <Button
                primary
                noMargin
                enabled={!isRequestInProgress}
                loading={isRequestInProgress}
                onClick={handleConfirm}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default MilestoneArticlesModal;
