import React from 'react';
import { css } from '@emotion/react';

import { Display, Paragraph } from '../atoms';
import { rem } from '../pixels';
import { colour, neutral500 } from '../colors';
import { contentSidePaddingWithNavigation } from '../layout';

const headerStyles = css({
  padding: `${rem(36)} ${contentSidePaddingWithNavigation(8)} ${rem(60)}`,
  background: colour.neutral[0],
  boxShadow: `0 2px 4px -2px ${neutral500.rgb}`,
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

type ManuscriptHeaderProps = {
  resubmitManuscript?: boolean;
  isEditMode?: boolean;
};

const ManuscriptHeader: React.FC<ManuscriptHeaderProps> = ({
  resubmitManuscript = false,
  isEditMode = false,
}) => {
  const title = isEditMode
    ? 'Edit Manuscript'
    : `Submit ${resubmitManuscript ? 'Revised' : 'New'} Manuscript`;

  const getDescription = () => {
    if (isEditMode) {
      return "Edit the details of this manuscript. It has already been submitted, so some fields may not be available. If you need to correct something that's blocked, contact your PM.";
    }
    if (resubmitManuscript) {
      return 'Resubmit your manuscript based on the last compliance report you received. All details below were duplicated from the previous manuscript.';
    }
    return 'Start a new manuscript to receive an itemized compliance report outlining action items for compliance with the ASAP Open Science Policy.';
  };

  return (
    <header css={headerStyles}>
      <div css={contentStyles}>
        <Display styleAsHeading={2}>{title}</Display>
        <div>
          <Paragraph noMargin accent="neutral900">
            {getDescription()}
          </Paragraph>
        </div>
      </div>
    </header>
  );
};

export default ManuscriptHeader;
