import React, { ReactNode } from 'react';
import { css } from '@emotion/react';
import {
  ResearchOutputDocumentType,
  ResearchOutputEntityType,
} from '@asap-hub/model';

import { dashboard, news } from '@asap-hub/routing';
import { Display, Link, Paragraph } from '../atoms';
import { rem } from '../pixels';
import { colour } from '../colors';
import { contentSidePaddingWithNavigation } from '../layout';
import { BreadcrumbItem, Breadcrumbs } from '../molecules';

const headerStyles = css({
  padding: `${rem(36)} ${contentSidePaddingWithNavigation(8)} ${rem(60)}`,
  background: colour.background.primary,
  boxShadow: `0 2px 4px -2px ${colour.neutral[100]}`,
  marginBottom: rem(30),
  display: 'flex',
  justifyContent: 'center',
});

const headerWithBreadcrumbsStyles = css({
  paddingTop: rem(12),
});

const breadcrumbsStyles = css({
  marginBottom: rem(48),
});

const contentStyles = css({
  display: 'flex',
  flexDirection: 'column',
  maxWidth: rem(800),
  width: '100%',
  justifyContent: 'center',
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

const getDocumentLabel = (
  entityType: ResearchOutputEntityType,
  documentType: ResearchOutputDocumentType,
) =>
  documentType === 'Report' && entityType === 'working-group'
    ? 'CRN Report'
    : documentType;

const getArticle = (documentType: ResearchOutputDocumentType, noun: string) => {
  if (documentType === 'Bioinformatics') return '';
  return /^[aeiou]/i.test(noun) ? 'an ' : 'a ';
};

const getHeaderText = (
  entityType: ResearchOutputEntityType,
  documentType: ResearchOutputDocumentType,
  isProjectOutput: boolean,
) => {
  const entityLabel = isProjectOutput
    ? entityLabelMap.project
    : entityLabelMap[entityType];

  const article = getArticle(documentType, entityLabel);
  const documentLabel = getDocumentLabel(entityType, documentType);

  return `Share ${article}${entityLabel} ${documentLabel}`;
};

const getBreadcrumbLabel = (
  entityType: ResearchOutputEntityType,
  documentType: ResearchOutputDocumentType,
) => {
  const documentLabel = getDocumentLabel(entityType, documentType);
  return `Share ${getArticle(documentType, documentLabel)}${documentLabel}`;
};

type ResearchOutputHeaderProps = {
  entityType: ResearchOutputEntityType;
  documentType: ResearchOutputDocumentType;
  isProjectOutput?: boolean;
  breadcrumbs?: ReadonlyArray<BreadcrumbItem>;
};

const ResearchOutputHeader: React.FC<ResearchOutputHeaderProps> = ({
  entityType,
  documentType,
  isProjectOutput = false,
  breadcrumbs = [],
}) => (
  <header
    css={[headerStyles, breadcrumbs.length > 0 && headerWithBreadcrumbsStyles]}
  >
    <div css={contentStyles}>
      {breadcrumbs.length > 0 && (
        <div css={breadcrumbsStyles}>
          <Breadcrumbs
            homeHref={dashboard({}).$}
            items={[
              ...breadcrumbs,
              { label: getBreadcrumbLabel(entityType, documentType) },
            ]}
          />
        </div>
      )}
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
  </header>
);

export default ResearchOutputHeader;
