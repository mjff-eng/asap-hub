import { ManuscriptVersionResponse } from '@asap-hub/model';
import { css, SerializedStyles } from '@emotion/react';
import { network } from '@asap-hub/routing';

import { Card, Headline3, Paragraph, Pill } from '../atoms';
import { mobileScreen, rem } from '../pixels';
import { neutral200, colour, neutral900 } from '../colors';
import { ThemeVariant } from '../theme';
import { contentSidePaddingWithNavigation } from '../layout';

const container = css({
  display: 'grid',
  padding: `${rem(32)} ${rem(24)}`,
});

const descriptionStyles = css({
  margin: `${rem(24)} 0`,
  color: neutral900.rgb,
});

const pillContainerStyles = css({
  display: 'flex',
  gap: rem(8),
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    flexDirection: 'column',
  },
});

export const themeStyles: Record<ThemeVariant, SerializedStyles> = {
  light: css({
    stroke: colour.brand.crn[500],
  }),
  grey: css({
    stroke: colour.brand.crn[500],
    ':active': { stroke: colour.brand.crn[800] },
  }),
  dark: css({
    stroke: colour.neutral[0],
    ':active': { stroke: colour.neutral[0] },
  }),
};
const mainStyles = css({
  padding: `${rem(36)} ${contentSidePaddingWithNavigation(8)} 0`,
  display: 'grid',
  justifyContent: 'center',
});

const wrapperStyles = css({
  maxWidth: rem(800),
});

const cardStyles = css({
  background: neutral200.rgb,
});

const titleStyles = css({
  margin: `${rem(8)} 0 ${rem(12)}`,
  color: neutral900.rgb,
});

const linkStyles = css({
  textDecoration: 'underline solid transparent',
  transition: 'text-decoration 100ms ease-in-out, color 100ms ease-in-out',
  color: colour.brand.crn[500],

  ':hover': {
    textDecoration: 'underline',
  },
  ':active': {
    textDecoration: 'none',
  },
});

export type ManuscriptVersionImportCardProps = {
  version: ManuscriptVersionResponse;
};

const ManuscriptVersionImportCard: React.FC<
  ManuscriptVersionImportCardProps
> = ({ version }) => (
  <div css={mainStyles}>
    <div css={wrapperStyles}>
      <Card padding={false} overrideStyles={cardStyles}>
        <div css={container}>
          <Headline3 noMargin>Imported Manuscript Version</Headline3>
          <div css={descriptionStyles}>
            <Paragraph noMargin>
              The details in the form below have been imported from the
              manuscript below, which was previously sent for an open science
              compliance review through the Hub's Open Science Compliance
              Submission System.
            </Paragraph>
          </div>
          <div css={pillContainerStyles}>
            <Pill accent="gray">{version.type}</Pill>
            <Pill accent="gray">{version.lifecycle}</Pill>
            <Pill accent="blue">{version.manuscriptId}</Pill>
          </div>
          <span css={titleStyles}>{version.title}</span>
          {version.teamId && (
            <a
              href={
                network({})
                  .teams({})
                  .team({ teamId: version.teamId })
                  .workspace({}).$
              }
              target={'_blank'}
              rel={'noreferrer noopener'}
              css={linkStyles}
            >
              Access the Open Science Compliance Workspace
            </a>
          )}
        </div>
      </Card>
    </div>
  </div>
);

export default ManuscriptVersionImportCard;
