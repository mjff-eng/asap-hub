import { css } from '@emotion/react';
import { ComponentProps, useEffect, useState } from 'react';
import { ArticleItem, ResearchOutputType } from '@asap-hub/model';

import { LabeledMultiSelect, Modal } from '../molecules';
import { crossIcon } from '../icons';
import { Button, Headline3, Paragraph, Spinner } from '../atoms';
import { mobileScreen, rem } from '../pixels';
import { colour } from '../colors';
import { ResearchOutputOption } from '../utils';
import { articleSelectComponents } from '../utils/article-select-components';
import { articlesToOptions } from './MilestoneArticlesModal';

const headerStyles = css({
  display: 'flex',
  flexDirection: 'row-reverse',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: rem(16),
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

const mainWrapStyles = css({
  padding: `${rem(32)} ${rem(24)}`,
});

const bodyParagraphStyles = css({
  marginTop: rem(24),
  marginBottom: 0,
});

const selectWrapperStyles = css({
  marginTop: rem(32),
});

const loadingWrapperStyles = css({
  marginTop: rem(72),
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: rem(12),
  height: rem(40),
});

const errorMessageStyles = css({
  marginTop: rem(8),
  color: colour.foreground.error,
});

export type MilestoneStatusConfirmationStatus = 'Complete' | 'Terminated';

type MilestoneStatusConfirmationModalProps = {
  readonly status: MilestoneStatusConfirmationStatus;
  readonly loadCurrentArticles: () => Promise<ReadonlyArray<ArticleItem>>;
  readonly onClose: () => void;
  readonly onConfirm: (articles: ReadonlyArray<ArticleItem>) => Promise<void>;
  readonly loadOptions: NonNullable<
    ComponentProps<
      typeof LabeledMultiSelect<ResearchOutputOption>
    >['loadOptions']
  >;
};

const optionsToArticles = (
  options: ReadonlyArray<ResearchOutputOption>,
): ReadonlyArray<ArticleItem> =>
  options.map((o) => ({
    id: o.value,
    title: o.label,
    href: `/shared-research/${o.value}`,
    type: o.type as ResearchOutputType | undefined,
  }));

const MilestoneStatusConfirmationModal: React.FC<
  MilestoneStatusConfirmationModalProps
> = ({ status, loadCurrentArticles, onClose, onConfirm, loadOptions }) => {
  const [selectedOptions, setSelectedOptions] = useState<
    ResearchOutputOption[]
  >([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoadingArticles, setIsLoadingArticles] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingArticles(true);
    setLoadError(false);

    loadCurrentArticles()
      .then((articles) => {
        if (cancelled) return;
        setSelectedOptions(articlesToOptions(articles));
        setIsLoadingArticles(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(true);
        setIsLoadingArticles(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loadCurrentArticles]);

  const isConfirmDisabled = isLoadingArticles || loadError || isSaving;

  return (
    <Modal padding={false} overrideModalStyles={widerModalStyles}>
      <div css={mainWrapStyles}>
        <header css={headerStyles}>
          <div css={controlsContainerStyles}>
            <Button small noMargin enabled={!isSaving} onClick={onClose}>
              {crossIcon}
            </Button>
          </div>
          <Headline3 noMargin>
            {`Set status to ${status}? This action is irreversible.`}
          </Headline3>
        </header>
        <Paragraph accent="tertiary" styles={bodyParagraphStyles}>
          {`Before marking a milestone as ${status}${
            status === 'Terminated' ? '' : ','
          } you may add any related articles associated with this milestone, if applicable. Once the status is set to ${status}, it cannot be changed, but related articles may still be added later. Relevant members will be notified via the CRN Hub and/or email. If further updates are required, please contact Technical Support.`}
        </Paragraph>
        {isLoadingArticles ? (
          <div css={loadingWrapperStyles}>
            <Spinner
              size={18}
              color={colour.neutral[600]}
              trackColor={colour.general.blue.cerulean[25]}
            />
            <Paragraph noMargin>Loading...</Paragraph>
          </div>
        ) : (
          <div css={selectWrapperStyles}>
            <LabeledMultiSelect<ResearchOutputOption>
              title="Related Articles"
              subtitle="(optional)"
              description="Add any articles associated with this milestone, if applicable. Only published articles on the CRN Hub will be available below. These articles will also be displayed in the corresponding Aim."
              placeholder="Start typing..."
              values={selectedOptions}
              loadOptions={loadOptions}
              onChange={(newValues) => setSelectedOptions([...newValues])}
              noOptionsMessage={() => 'No articles found'}
              components={articleSelectComponents}
              onMenuOpen={() => setIsMenuOpen(true)}
              onMenuClose={() => setIsMenuOpen(false)}
            />
            {loadError && (
              <Paragraph accent="tertiary" styles={errorMessageStyles}>
                Could not load existing articles. Please close this dialog and
                try again.
              </Paragraph>
            )}
          </div>
        )}
        <div css={buttonContainerStyles(isMenuOpen)}>
          <div css={cancelStyles}>
            <Button noMargin enabled={!isSaving} onClick={onClose}>
              Keep Editing
            </Button>
          </div>
          <div css={confirmStyles}>
            <Button
              primary
              noMargin
              enabled={!isConfirmDisabled}
              loading={isSaving}
              onClick={async () => {
                if (isConfirmDisabled) return;
                setIsSaving(true);
                try {
                  await onConfirm(optionsToArticles(selectedOptions));
                  onClose();
                } catch {
                  onClose();
                }
              }}
            >
              Confirm and Notify
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default MilestoneStatusConfirmationModal;
