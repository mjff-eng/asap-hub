import { createResearchOutputResponse } from '@asap-hub/fixtures';
import {
  GrantDocumentGrantsCard,
  GrantDocumentHeaderCard,
  GrantDocumentOverviewCard,
  GrantDocumentPdfCard,
  GrantDocumentTagsCard,
  SharedResearchOutputToasts,
} from '@asap-hub/react-components';

export default {
  title: 'Organisms / Grant Document',
};

export const Header = () => (
  <GrantDocumentHeaderCard
    {...createResearchOutputResponse()}
    documentType="Grant Document"
    title="Understanding the molecular mechanisms of Parkinson’s disease"
    link="https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf"
    grantType="original"
    project={{
      id: 'project-1',
      title: 'Discovery Project Title',
      projectType: 'Discovery Project',
    }}
  />
);

export const Overview = () => (
  <GrantDocumentOverviewCard text="We hypothesize that the functions of multiple Parkinson’s disease genes converge on common biochemical pathways involving endocytic organelles and/or mitochondria within vulnerable cell types." />
);

export const GrantDocumentPdf = () => (
  <GrantDocumentPdfCard link="https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf" />
);

export const Grants = () => (
  <GrantDocumentGrantsCard
    grantType="original"
    original={{
      researchOutputId: 'original-output',
      title: 'Original grant proposal',
      startDate: '2021-01-01',
      endDate: '2024-12-31',
    }}
    supplement={{
      researchOutputId: 'supplement-output',
      title: 'Supplement grant proposal',
      startDate: '2025-01-01',
      endDate: '2026-12-31',
    }}
  />
);

export const Tags = () => (
  <GrantDocumentTagsCard
    tags={[
      'Neurodegeneration',
      'Mitochondria',
      'Endocytosis',
      'Lysosome',
      'Autophagy',
      'Lewy bodies',
      'PINK1',
      'Parkin',
      'Alpha-synuclein',
      'LRRK2',
      'Dopaminergic neurons',
      'Neuroinflammation',
    ]}
  />
);

const toastProps = {
  association: 'project',
  associationName: 'Project title',
  documentType: 'Grant Document',
  published: true,
  isInReview: false,
  reviewToggled: false,
  statusChangedBy: undefined,
};

export const SupplementToast = () => (
  <SharedResearchOutputToasts
    {...toastProps}
    supplementGrantHref="/shared-research/supplement-output"
  />
);

export const GrantEndedToast = () => (
  <SharedResearchOutputToasts {...toastProps} grantEnded />
);
