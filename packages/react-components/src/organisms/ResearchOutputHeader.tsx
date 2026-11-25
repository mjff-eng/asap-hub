import React, { ReactNode, useState } from 'react';
import { css } from '@emotion/react';
import { useLocation, useNavigate } from 'react-router';
import {
  ResearchOutputDocumentType,
  ResearchOutputEntityType,
} from '@asap-hub/model';

import { dashboard, news } from '@asap-hub/routing';
import { Button, Display, Link, Paragraph } from '../atoms';
import { casTextStyles } from '../cas-tokens.generated';
import { arrowLeftIcon } from '../icons';
import { useNavigationBlocker } from '../navigation';
import { rem, remUnit } from '../pixels';
import { colour } from '../colors';
import { contentSidePaddingWithNavigation } from '../layout';
import { textStyle } from '../text';
import ConfirmModal from './ConfirmModal';

const headerStyles = css({
  padding: `${rem(12)} ${contentSidePaddingWithNavigation(8)} ${rem(60)}`,
  background: colour.background.primary,
  boxShadow: `0 2px 4px -2px ${colour.neutral[100]}`,
  marginBottom: rem(30),
  display: 'flex',
  justifyContent: 'center',
});

const contentStyles = css({
  display: 'flex',
  flexDirection: 'column',
  maxWidth: rem(800),
  width: '100%',
  justifyContent: 'center',
});

// The title's own 12px top margin completes the 40px gap below Back.
const backStyles = css({
  ...textStyle(casTextStyles.button.mid),
  // flex, not the link style's inline, so the label's line box doesn't add
  // height over the 36px button
  display: 'flex',
  alignSelf: 'flex-start',
  padding: `${rem(8)} 0`,
  marginBottom: rem(28),
  color: colour.foreground.button.tertiary.default,
  textDecoration: 'none',
  ':hover, :focus': {
    color: colour.foreground.button.tertiary.hover,
    textDecoration: 'none',
  },
});

const backLabelStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: rem(8),
  svg: {
    width: remUnit(20),
    height: remUnit(20),
  },
});

const subheaderRecord: Record<ResearchOutputDocumentType, ReactNode | null> = {
  Protocol: (
    <>
      Add your protocol to a repository (e.g. protocols.io) before sharing on
      the Hub. Find out{' '}
      <Link
        href={
          news({}).article({
            articleId: '7d3dd1ec-14ef-441c-8a2c-19a23d6264f3',
          }).$
        }
      >
        how to add to protocols.io
      </Link>{' '}
      to get started.
    </>
  ),
  Dataset: (
    <>
      Add your dataset to a platform (e.g., CRN Cloud, Zenodo). View the{' '}
      <Link href="https://youneedawiki.com/app/page/1dTXSFCM-EmnEMTQjWsYWt6V5hPiAokXt?p=1dTXSFCM-EmnEMTQjWsYWt6V5hPiAokXt">
        ASAP Data Repositories Wiki
      </Link>{' '}
      for more information on how to share your datasets.
    </>
  ),
  Bioinformatics: (
    <>
      Add bioinformatics, such as scripts or software, to a platform (e.g.
      Github) before sharing on the Hub.
    </>
  ),
  'Lab Material': (
    <>
      Add your lab material to a repository (e.g. Addgene or WiCell) before
      sharing on the Hub, if possible. Alternatively, find out{' '}
      <Link
        href={
          'https://drive.google.com/file/d/1qJ2nbqFl5AquhgvUwwxxyOL_k_BMaD2X/view'
        }
      >
        how to distribute a resource
      </Link>{' '}
      through ASAP’s tool program.
    </>
  ),
  Article: <>Share your preprint or published article on the Hub.</>,
  Report: (
    <>
      If possible, please add your CRN report (for example, survey and table
      summaries, CRN guidelines, etc.) to the working group google folder before
      sharing on the Hub.
    </>
  ),
  'Grant Document': null,
  Presentation: null,
};

const entityLabelMap: Record<ResearchOutputEntityType, string> = {
  'working-group': 'Working Group',
  team: 'Team',
  project: 'Project',
};

const getHeaderText = (
  entityType: ResearchOutputEntityType,
  documentType: ResearchOutputDocumentType,
  isProjectOutput: boolean,
) => {
  const entityLabel = isProjectOutput
    ? entityLabelMap.project
    : entityLabelMap[entityType];
  const documentLabel =
    documentType === 'Report' && entityType === 'working-group'
      ? 'CRN Report'
      : documentType;
  const article = documentType === 'Bioinformatics' ? '' : 'a ';

  return `Share ${article}${entityLabel} ${documentLabel}`;
};

type ResearchOutputHeaderProps = {
  entityType: ResearchOutputEntityType;
  documentType: ResearchOutputDocumentType;
  isProjectOutput?: boolean;
};

const ResearchOutputHeader: React.FC<ResearchOutputHeaderProps> = ({
  entityType,
  documentType,
  isProjectOutput = false,
}) => {
  const navigate = useNavigate();
  const { key } = useLocation();
  const { isBlocked, allowNextNavigation } = useNavigationBlocker();
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const goBack = () => {
    // A form opened straight from its URL has no page of the Hub to go back to
    if (key === 'default') {
      void navigate(dashboard({}).$);
      return;
    }
    // The form's browser back guard would ask again with the native confirm
    if (isBlocked) {
      allowNextNavigation();
    }
    void navigate(-1);
  };

  return (
    <header css={headerStyles}>
      <div css={contentStyles}>
        <Button
          linkStyle
          overrideStyles={backStyles}
          onClick={() => (isBlocked ? setConfirmingDiscard(true) : goBack())}
        >
          <span css={backLabelStyles}>
            {arrowLeftIcon}
            Back
          </span>
        </Button>
        <Display styleAsHeading={4}>
          {getHeaderText(entityType, documentType, isProjectOutput)}
        </Display>
        <div>
          {subheaderRecord[documentType] && (
            <Paragraph noMargin accent="tertiary">
              {subheaderRecord[documentType]}
            </Paragraph>
          )}
        </div>
      </div>
      {confirmingDiscard && (
        <ConfirmModal
          hideClose
          title="Discard changes?"
          description="All the information you've entered will be lost."
          cancelText="Keep editing"
          confirmText="Discard"
          onCancel={() => setConfirmingDiscard(false)}
          onSave={goBack}
        />
      )}
    </header>
  );
};

export default ResearchOutputHeader;
