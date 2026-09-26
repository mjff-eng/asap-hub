import { ResearchOutputVersion } from '@asap-hub/model';
import { css, SerializedStyles } from '@emotion/react';
import { useState } from 'react';

import { Button, Card, Headline2, Link, Paragraph, Pill } from '../atoms';
import { rem, tabletScreen } from '../pixels';
import { colour } from '../colors';
import { formatDateToTimezone } from '../date';
import { ExternalLinkIcon } from '../icons';
import { contentSidePaddingWithNavigation } from '../layout';
import { mailToSupport, TECH_SUPPORT_EMAIL } from '../mail';
import { ThemeVariant } from '../theme';

const container = css({
  display: 'grid',
  padding: `${rem(32)} ${rem(24)}`,
});

const descriptionStyles = css({
  marginTop: rem(24),
  marginBottom: rem(12),
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    marginBottom: rem(32),
  },
  color: colour.foreground.tertiary,
});

const gridTitleStyles = css({
  display: 'none',
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    display: 'inherit',
    paddingBottom: rem(16),
  },
});

const rowTitleStyles = css({
  paddingTop: rem(32),
  paddingBottom: rem(16),
  ':first-of-type': { paddingTop: 0 },
  [`@media (min-width: ${tabletScreen.min}px)`]: { display: 'none' },
});

const rowStyles = css({
  display: 'grid',
  paddingTop: rem(20),
  paddingBottom: rem(20),
  borderBottom: `1px solid ${colour.border.tertiary}`,
  ':last-child': {
    borderBottom: 'none',
    marginBottom: 0,
    paddingBottom: 0,
  },
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    gridTemplateColumns: '0.2fr 0.5fr 1fr 1fr 1fr',
    columnGap: rem(15),
    paddingTop: rem(0),
    paddingBottom: rem(16),
    borderBottom: 'none',
  },
});

const paragraphStyle = css({
  marginTop: 0,
  marginBottom: 0,
  display: 'flex',
  alignItems: 'center',
  flexDirection: 'row',
  gap: rem(6),
  color: colour.foreground.tertiary,
});

const showMoreStyles = css({
  display: 'flex',
  justifyContent: 'center',
  marginTop: rem(32),
  paddingTop: rem(16),
  paddingBottom: rem(16),
  borderTop: `1px solid ${colour.border.tertiary}`,
});

const titleStyles = css({
  fontWeight: 'bold',
  color: colour.foreground.primary,
});

export const themeStyles: Record<ThemeVariant, SerializedStyles> = {
  light: css({
    stroke: colour.foreground.brand,
  }),
  grey: css({
    stroke: colour.foreground.brand,
    ':active': { stroke: colour.border.brand },
  }),
  dark: css({
    stroke: colour.foreground['primary-inverse'],
    ':active': { stroke: colour.foreground['primary-inverse'] },
  }),
};

const mainStyles = css({
  padding: `${rem(36)} ${contentSidePaddingWithNavigation(8)} 0`,
  display: 'grid',
  justifyContent: 'center',
});

const createVersionWrapperStyles = css({
  maxWidth: rem(800),
});

const createVersionCardStyles = css({
  background: colour.background.secondary,
});

type Version = Omit<ResearchOutputVersion, 'documentType' | 'type'> & {
  documentType?: string;
  type?: string;
};

export type OutputVersionsProps = {
  readonly themeVariant?: ThemeVariant;
  versions: Version[];
  versionAction?: 'create' | 'edit';
  app?: 'crn' | 'gp2';
};

const OutputVersions: React.FC<OutputVersionsProps> = ({
  versions,
  versionAction,
  app,
}) => {
  const truncateFrom = 5;
  const [showMore, setShowMore] = useState(false);
  const displayShowMoreButton = versions.length > 5;

  const iconsStyles = css({
    position: 'relative',
    top: '6px',
    display: 'inline-flex',
    alignSelf: 'center',
  });

  return (
    <main css={versionAction && app === 'crn' ? [mainStyles] : []}>
      <div css={versionAction ? [createVersionWrapperStyles] : []}>
        <Card
          padding={false}
          overrideStyles={versionAction ? createVersionCardStyles : undefined}
        >
          <div
            css={[
              container,
              ...(displayShowMoreButton ? [{ paddingBottom: 0 }] : []),
            ]}
          >
            <Headline2 noMargin>Version History</Headline2>
            <div css={descriptionStyles}>
              {versionAction ? (
                <Paragraph noMargin>
                  List with all previous output versions that contributed to
                  this one. In case you want to add or edit older versions,
                  please contact{' '}
                  <Link href={mailToSupport()}> {TECH_SUPPORT_EMAIL}</Link>.
                </Paragraph>
              ) : (
                <Paragraph noMargin>
                  Find all previous output versions that contributed to this
                  one.
                </Paragraph>
              )}
            </div>
            <div css={[rowStyles, gridTitleStyles]}>
              <span css={titleStyles}>Ver.</span>
              <span css={titleStyles}>Type</span>
              <span css={titleStyles}>Shared Output Name</span>
              <span css={titleStyles}>Date Posted</span>
              <span css={titleStyles}>Link</span>
            </div>
            {versions
              .slice(0, showMore ? undefined : truncateFrom)
              .map(
                ({ id, documentType, title, type, addedDate, link }, index) => (
                  <div key={id} css={[rowStyles]}>
                    <span css={[titleStyles, rowTitleStyles]}>Ver.</span>
                    <p css={paragraphStyle}>#{index + 1}</p>
                    <span css={[titleStyles, rowTitleStyles]}>Type</span>
                    <p css={paragraphStyle}>
                      {documentType === 'Report' ? (
                        <Pill accent="gray">Report</Pill>
                      ) : (
                        type && <Pill accent="gray">{type}</Pill>
                      )}
                    </p>
                    <span css={[titleStyles, rowTitleStyles]}>
                      Shared Output Name
                    </span>
                    <p css={paragraphStyle}>{title}</p>
                    <span css={[titleStyles, rowTitleStyles]}>Date Posted</span>
                    <p css={paragraphStyle}>
                      {addedDate &&
                        formatDateToTimezone(
                          addedDate,
                          'EEE, dd MMM yyyy',
                        ).toUpperCase()}
                    </p>
                    <span css={[titleStyles, rowTitleStyles]}>Link</span>
                    <p css={paragraphStyle}>
                      <Link ellipsed href={link} applyIconTheme>
                        Output{' '}
                        <span css={iconsStyles}>
                          <ExternalLinkIcon />
                        </span>
                      </Link>
                    </p>
                  </div>
                ),
              )}
          </div>
          {displayShowMoreButton && (
            <div css={showMoreStyles}>
              <Button linkStyle onClick={() => setShowMore(!showMore)}>
                View {showMore ? 'Less' : 'More'} Versions
              </Button>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
};

export default OutputVersions;
